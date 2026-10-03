"""Tests for CatalogSyncService using a fake GenshinDbClient.

We mock at the client boundary (not at HTTP level) because we're testing
business logic — mapping, upsert, dedup, error handling — not HTTP.
"""

from collections.abc import AsyncGenerator
from typing import Any

import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.character import Character
from app.models.weapon import Weapon
from app.schemas.external.genshin_db import (
    CharacterImages,
    ExternalCharacter,
    ExternalWeapon,
    WeaponImages,
)
from app.services.catalog_sync import CatalogSyncService
from app.services.genshin_db_client import GenshinDbClientError


def _char(
    *,
    id: int = 10000046,
    name: str = "Hu Tao",
    element: str = "ELEMENT_PYRO",
    weapon: str = "WEAPON_POLEARM",
    rarity: int = 5,
) -> ExternalCharacter:
    return ExternalCharacter(
        id=id,
        name=name,
        title="Title",
        element_type=element,
        element_text="Element",
        weapon_type=weapon,
        weapon_text="Weapon",
        rarity=rarity,
        region="Liyue",
        birthday_mmdd="7/15",
        images=CharacterImages(card="https://example.com/card.png"),
        version="1.0",
    )


def _weapon(
    *,
    id: int = 13501,
    name: str = "Staff of Homa",
    weapon: str = "WEAPON_POLEARM",
    rarity: int = 5,
) -> ExternalWeapon:
    return ExternalWeapon(
        id=id,
        name=name,
        weapon_type=weapon,
        weapon_text="Polearm",
        rarity=rarity,
        base_atk_value=45.9,
        main_stat_text="CRIT DMG",
        images=WeaponImages(icon="https://example.com/icon.png"),
        version="1.0",
    )


class FakeClient:
    """In-memory fake of GenshinDbClient for sync tests."""

    def __init__(self) -> None:
        self.characters: list[str] = []
        self.characters_detail: dict[str, ExternalCharacter] = {}
        self.weapons: list[str] = []
        self.weapons_detail: dict[str, ExternalWeapon] = {}
        self.artifacts: list[str] = []
        self.artifacts_detail: dict[str, Any] = {}
        self.raise_on_list_characters: Exception | None = None

    async def list_characters(self) -> list[str]:
        if self.raise_on_list_characters is not None:
            raise self.raise_on_list_characters
        return list(self.characters)

    async def list_weapons(self) -> list[str]:
        return list(self.weapons)

    async def list_artifacts(self) -> list[str]:
        return list(self.artifacts)

    async def get_character(self, name: str) -> ExternalCharacter | None:
        return self.characters_detail.get(name)

    async def get_weapon(self, name: str) -> ExternalWeapon | None:
        return self.weapons_detail.get(name)

    async def get_artifact(self, name: str) -> Any:
        return self.artifacts_detail.get(name)


@pytest_asyncio.fixture
async def fake_client() -> AsyncGenerator[FakeClient, None]:
    yield FakeClient()


class TestSyncCharacters:
    async def test_inserts_new_character(
        self, db_session: AsyncSession, fake_client: FakeClient
    ) -> None:
        fake_client.characters = ["Hu Tao"]
        fake_client.characters_detail["Hu Tao"] = _char()

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats = await service.sync_characters()

        assert stats.added == 1
        assert stats.updated == 0
        assert stats.failed == 0

        row = await db_session.scalar(select(Character).where(Character.slug == "hu-tao"))
        assert row is not None
        assert row.name == "Hu Tao"
        assert row.rarity == 5

    async def test_updates_existing_character(
        self, db_session: AsyncSession, fake_client: FakeClient
    ) -> None:
        fake_client.characters = ["Hu Tao"]
        fake_client.characters_detail["Hu Tao"] = _char(rarity=5)

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats1 = await service.sync_characters()
        assert stats1.added == 1

        # Change rarity upstream, re-run
        fake_client.characters_detail["Hu Tao"] = _char(rarity=5)
        stats2 = await service.sync_characters()
        assert stats2.added == 0
        assert stats2.updated == 1

    async def test_skips_non_playable_names(
        self, db_session: AsyncSession, fake_client: FakeClient
    ) -> None:
        fake_client.characters = ["Aether", "Hu Tao"]
        fake_client.characters_detail["Aether"] = _char(id=1, name="Aether")
        fake_client.characters_detail["Hu Tao"] = _char()

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats = await service.sync_characters()

        # Aether not in DB
        aether = await db_session.scalar(select(Character).where(Character.name == "Aether"))
        assert aether is None
        # Hu Tao is in DB
        hu_tao = await db_session.scalar(select(Character).where(Character.name == "Hu Tao"))
        assert hu_tao is not None
        assert stats.added == 1

    async def test_missing_detail_counts_as_failed(
        self, db_session: AsyncSession, fake_client: FakeClient
    ) -> None:
        fake_client.characters = ["Hu Tao", "Ghost"]
        fake_client.characters_detail["Hu Tao"] = _char()
        # "Ghost" is intentionally not in detail → get_character returns None

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats = await service.sync_characters()

        assert stats.added == 1
        assert stats.failed == 1
        assert any("Ghost" in e for e in stats.errors)

    async def test_dedup_by_external_id(
        self, db_session: AsyncSession, fake_client: FakeClient
    ) -> None:
        # Two names, same external_id
        fake_client.characters = ["Hu Tao", "Hu Tao Duplicate"]
        fake_client.characters_detail["Hu Tao"] = _char(id=99999, name="Hu Tao")
        fake_client.characters_detail["Hu Tao Duplicate"] = _char(id=99999, name="Hu Tao Duplicate")

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats = await service.sync_characters()

        assert stats.added == 1
        assert stats.failed == 1
        assert any("duplicate" in e.lower() for e in stats.errors)


class TestSyncWeapons:
    async def test_inserts_weapon(self, db_session: AsyncSession, fake_client: FakeClient) -> None:
        fake_client.weapons = ["Staff of Homa"]
        fake_client.weapons_detail["Staff of Homa"] = _weapon()

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats = await service.sync_weapons()

        assert stats.added == 1
        row = await db_session.scalar(select(Weapon).where(Weapon.slug == "staff-of-homa"))
        assert row is not None
        assert row.weapon_type.value == "polearm"

    async def test_weapon_with_unknown_type_is_skipped(
        self, db_session: AsyncSession, fake_client: FakeClient
    ) -> None:
        fake_client.weapons = ["Weird"]
        fake_client.weapons_detail["Weird"] = _weapon(id=1, name="Weird", weapon="WEAPON_NONE")

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats = await service.sync_weapons()

        # Unknown type → upsert returns False → counted as "updated", not inserted
        row = await db_session.scalar(select(Weapon).where(Weapon.name == "Weird"))
        assert row is None
        assert stats.added == 0


class TestSyncAll:
    async def test_sync_all_aggregates(
        self, db_session: AsyncSession, fake_client: FakeClient
    ) -> None:
        fake_client.characters = ["Hu Tao"]
        fake_client.characters_detail["Hu Tao"] = _char()
        fake_client.weapons = ["Staff of Homa"]
        fake_client.weapons_detail["Staff of Homa"] = _weapon()
        # no artifacts — list_artifacts returns []

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats = await service.sync_all()

        assert stats.added == 2
        assert stats.failed == 0

    async def test_sync_artifacts_handles_client_error(
        self, db_session: AsyncSession, fake_client: FakeClient
    ) -> None:
        """sync_artifacts catches client errors on list and returns zero stats."""
        from unittest.mock import AsyncMock

        fake_client.list_artifacts = AsyncMock(  # type: ignore[method-assign]
            side_effect=GenshinDbClientError("boom")
        )

        service = CatalogSyncService(db_session, fake_client)  # type: ignore[arg-type]
        stats = await service.sync_artifacts()

        assert stats.added == 0
        assert stats.failed == 0
