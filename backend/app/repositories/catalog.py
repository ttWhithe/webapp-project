"""Repositories for the catalog: characters, weapons, artifact sets.

Each `list_*` method returns a tuple (items, total) to support pagination
without a second round-trip.
"""

import uuid
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.enums import Element, WeaponType
from app.models.weapon import Weapon

# Whitelisted sort keys — never interpolate raw user input into order_by.
# Typed as dict[str, Any] because values are heterogeneous UnaryExpression types.
CHARACTER_SORTS: dict[str, Any] = {
    "name_asc": Character.name.asc(),
    "rarity_desc": Character.rarity.desc(),
    "version_desc": Character.version_added.desc().nulls_last(),
}

WEAPON_SORTS: dict[str, Any] = {
    "name_asc": Weapon.name.asc(),
    "rarity_desc": Weapon.rarity.desc(),
    "version_desc": Weapon.version_added.desc().nulls_last(),
}


class CharacterRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_characters(
        self,
        *,
        element: Element | None = None,
        weapon_type: WeaponType | None = None,
        rarity: int | None = None,
        sort: str = "name_asc",
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Character], int]:
        stmt: Select[Any] = select(Character)
        if element is not None:
            stmt = stmt.where(Character.element == element)
        if weapon_type is not None:
            stmt = stmt.where(Character.weapon_type == weapon_type)
        if rarity is not None:
            stmt = stmt.where(Character.rarity == rarity)

        total = await self._count(stmt)
        stmt = stmt.order_by(CHARACTER_SORTS.get(sort, CHARACTER_SORTS["name_asc"]))
        stmt = stmt.limit(limit).offset(offset)
        result = await self._session.scalars(stmt)
        return list(result.all()), total

    async def get_by_slug(self, slug: str) -> Character | None:
        return await self._session.scalar(select(Character).where(Character.slug == slug))

    async def get_by_id(self, char_id: uuid.UUID) -> Character | None:
        return await self._session.get(Character, char_id)

    async def _count(self, stmt: Select[Any]) -> int:
        count_stmt = select(func.count()).select_from(stmt.subquery())
        return await self._session.scalar(count_stmt) or 0

    async def commit(self) -> None:
        await self._session.commit()

    async def refresh(self, instance: Character) -> None:
        await self._session.refresh(instance)


class WeaponRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_weapons(
        self,
        *,
        weapon_type: WeaponType | None = None,
        rarity: int | None = None,
        sort: str = "name_asc",
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Weapon], int]:
        stmt: Select[Any] = select(Weapon)
        if weapon_type is not None:
            stmt = stmt.where(Weapon.weapon_type == weapon_type)
        if rarity is not None:
            stmt = stmt.where(Weapon.rarity == rarity)

        total = await self._count(stmt)
        stmt = stmt.order_by(WEAPON_SORTS.get(sort, WEAPON_SORTS["name_asc"]))
        stmt = stmt.limit(limit).offset(offset)
        result = await self._session.scalars(stmt)
        return list(result.all()), total

    async def get_by_slug(self, slug: str) -> Weapon | None:
        return await self._session.scalar(select(Weapon).where(Weapon.slug == slug))

    async def get_by_id(self, weapon_id: uuid.UUID) -> Weapon | None:
        return await self._session.get(Weapon, weapon_id)

    async def _count(self, stmt: Select[Any]) -> int:
        count_stmt = select(func.count()).select_from(stmt.subquery())
        return await self._session.scalar(count_stmt) or 0

    async def commit(self) -> None:
        await self._session.commit()

    async def refresh(self, instance: Weapon) -> None:
        await self._session.refresh(instance)


class ArtifactSetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_sets(
        self,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[ArtifactSet], int]:
        stmt: Select[Any] = select(ArtifactSet)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = await self._session.scalar(count_stmt) or 0

        stmt = stmt.order_by(ArtifactSet.name.asc()).limit(limit).offset(offset)
        result = await self._session.scalars(stmt)
        return list(result.all()), total

    async def get_by_id(self, set_id: uuid.UUID) -> ArtifactSet | None:
        return await self._session.get(ArtifactSet, set_id)

    async def commit(self) -> None:
        await self._session.commit()

    async def refresh(self, instance: ArtifactSet) -> None:
        await self._session.refresh(instance)
