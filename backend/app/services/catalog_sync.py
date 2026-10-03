"""Catalog sync service: ETL from genshin-db-api into our database.

Design:
- Extract: GenshinDbClient fetches names + details.
- Transform: catalog_mappers convert external enum strings to domain enums.
- Load: idempotent upsert by external_id (or slug for artifacts).
- Commit-per-resource: characters and weapons commit independently, so a partial
  failure in artifacts does not roll back characters.
- Concurrent detail fetches, throttled inside the client via asyncio.Semaphore.
"""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TypeVar

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import log
from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.weapon import Weapon
from app.schemas.external.genshin_db import (
    ExternalArtifactSet,
    ExternalCharacter,
    ExternalWeapon,
)
from app.services.catalog_mappers import (
    should_skip_character,
    to_element,
    to_slug,
    to_weapon_type,
)
from app.services.genshin_db_client import GenshinDbClient, GenshinDbClientError

T = TypeVar("T")


@dataclass
class SyncStats:
    """Aggregate counters for one sync run."""

    added: int = 0
    updated: int = 0
    failed: int = 0
    errors: list[str] = field(default_factory=list)

    def merge(self, other: "SyncStats") -> None:
        self.added += other.added
        self.updated += other.updated
        self.failed += other.failed
        self.errors.extend(other.errors)


class CatalogSyncService:
    """Synchronizes the catalog with the external genshin-db-api."""

    def __init__(self, session: AsyncSession, client: GenshinDbClient) -> None:
        self._session = session
        self._client = client

    async def sync_all(self) -> SyncStats:
        total = SyncStats()
        total.merge(await self.sync_characters())
        total.merge(await self.sync_weapons())
        total.merge(await self.sync_artifacts())
        return total

    async def sync_characters(self) -> SyncStats:
        names = await self._client.list_characters()
        items = await self._fetch_all(names, self._client.get_character)
        return await self._apply(items, "character", self._upsert_character)

    async def sync_weapons(self) -> SyncStats:
        names = await self._client.list_weapons()
        items = await self._fetch_all(names, self._client.get_weapon)
        return await self._apply(items, "weapon", self._upsert_weapon)

    async def sync_artifacts(self) -> SyncStats:
        try:
            names = await self._client.list_artifacts()
        except GenshinDbClientError as exc:
            log.warning("artifacts_list_failed", error=str(exc))
            return SyncStats()
        items = await self._fetch_all(names, self._client.get_artifact)
        return await self._apply(items, "artifact", self._upsert_artifact)

    # ---------- internals ----------

    async def _fetch_all(
        self,
        names: list[str],
        fetch_one: Callable[[str], Awaitable[T | None]],
    ) -> list[tuple[str, T | None]]:
        """Fetch all details concurrently.

        The client's semaphore limits real parallelism; a failure of one item
        does not cancel the rest.
        """
        results = await asyncio.gather(*(self._safe_fetch(fetch_one, name) for name in names))
        return list(zip(names, results, strict=True))

    @staticmethod
    async def _safe_fetch(
        fetch_one: Callable[[str], Awaitable[T | None]],
        name: str,
    ) -> T | None:
        try:
            return await fetch_one(name)
        except (GenshinDbClientError, ValidationError) as exc:
            log.warning("catalog_fetch_failed", name=name, error=str(exc))
            return None

    async def _apply(
        self,
        items: list[tuple[str, T | None]],
        label: str,
        upsert: Callable[[T], Awaitable[bool]],
    ) -> SyncStats:
        stats = SyncStats()
        seen_external_ids: set[int] = set()

        for name, ext in items:
            if ext is None:
                stats.failed += 1
                stats.errors.append(f"{label} {name}: fetch failed")
                continue

            # Dedup by external_id — the upstream API returns duplicates for some
            # weapons, and since our session has autoflush=False, the SELECT in
            # _upsert_* does not see pending inserts from earlier iterations.
            ext_id = getattr(ext, "id", None)
            if isinstance(ext_id, int):
                if ext_id in seen_external_ids:
                    log.warning(
                        "catalog_duplicate_skipped",
                        label=label,
                        name=name,
                        external_id=ext_id,
                    )
                    stats.failed += 1
                    stats.errors.append(f"{label} {name}: duplicate external_id {ext_id}")
                    continue
                seen_external_ids.add(ext_id)

            try:
                added = await upsert(ext)
                if added:
                    stats.added += 1
                else:
                    stats.updated += 1
            except Exception as exc:
                log.exception("catalog_upsert_failed", label=label, name=name)
                stats.failed += 1
                stats.errors.append(f"{label} {name}: {exc}")

        await self._session.commit()
        return stats

    async def _upsert_character(self, ext: ExternalCharacter) -> bool:
        if should_skip_character(ext.name):
            return False

        existing = await self._session.scalar(
            select(Character).where(Character.external_id == ext.id)
        )
        if existing is None:
            self._session.add(
                Character(
                    id=uuid.uuid4(),
                    external_id=ext.id,
                    slug=to_slug(ext.name),
                    name=ext.name,
                    title=ext.title,
                    element=to_element(ext.element_type),
                    weapon_type=to_weapon_type(ext.weapon_type),
                    rarity=ext.rarity,
                    region=ext.region,
                    birthday=ext.birthday_mmdd,
                    icon_url=ext.images.card or ext.images.icon,
                    portrait_url=ext.images.portrait,
                    version_added=ext.version,
                )
            )
            return True
        existing.name = ext.name
        existing.title = ext.title
        existing.element = to_element(ext.element_type)
        existing.weapon_type = to_weapon_type(ext.weapon_type)
        existing.rarity = ext.rarity
        existing.region = ext.region
        existing.birthday = ext.birthday_mmdd
        existing.icon_url = ext.images.card or ext.images.icon
        existing.portrait_url = ext.images.portrait
        existing.version_added = ext.version
        return False

    async def _upsert_weapon(self, ext: ExternalWeapon) -> bool:
        # Some weapons (e.g. "Aloy's Bow" — if present) may lack a weapon type.
        # Just skip them; they aren't user-obtainable anyway.
        try:
            wt = to_weapon_type(ext.weapon_type)
        except ValueError:
            return False

        existing = await self._session.scalar(select(Weapon).where(Weapon.external_id == ext.id))
        if existing is None:
            self._session.add(
                Weapon(
                    id=uuid.uuid4(),
                    external_id=ext.id,
                    slug=to_slug(ext.name),
                    name=ext.name,
                    weapon_type=wt,
                    rarity=ext.rarity,
                    base_atk=ext.base_atk_value,
                    main_stat=ext.main_stat_text,
                    icon_url=ext.images.icon,
                    version_added=ext.version,
                )
            )
            return True
        existing.name = ext.name
        existing.weapon_type = wt
        existing.rarity = ext.rarity
        existing.base_atk = ext.base_atk_value
        existing.main_stat = ext.main_stat_text
        existing.icon_url = ext.images.icon
        existing.version_added = ext.version
        return False

    async def _upsert_artifact(self, ext: ExternalArtifactSet) -> bool:
        existing = await self._session.scalar(
            select(ArtifactSet).where(ArtifactSet.slug == to_slug(ext.name))
        )
        icon = ext.images.flower or ext.images.circlet or None
        if existing is None:
            self._session.add(
                ArtifactSet(
                    id=uuid.uuid4(),
                    external_id=ext.id,
                    slug=to_slug(ext.name),
                    name=ext.name,
                    icon_url=icon,
                )
            )
            return True
        existing.name = ext.name
        existing.icon_url = icon
        return False
