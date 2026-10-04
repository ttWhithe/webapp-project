"""Repository for user's tracked characters."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.user_artifact import UserArtifact
from app.models.user_character import UserCharacter


class UserCharacterRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(self, user_id: uuid.UUID) -> list[UserCharacter]:
        """List with character + artifacts eagerly loaded (needed for progress)."""
        stmt = (
            select(UserCharacter)
            .where(UserCharacter.user_id == user_id)
            .options(
                joinedload(UserCharacter.character),
                selectinload(UserCharacter.artifacts),
            )
            .order_by(UserCharacter.created_at.desc())
        )
        result = await self._session.scalars(stmt)
        return list(result.unique().all())

    async def get_by_id_for_user(
        self, user_character_id: uuid.UUID, user_id: uuid.UUID
    ) -> UserCharacter | None:
        """Fetch one record with full relations (character, weapon, artifacts+sets)."""
        stmt = (
            select(UserCharacter)
            .where(
                UserCharacter.id == user_character_id,
                UserCharacter.user_id == user_id,
            )
            .options(
                joinedload(UserCharacter.character),
                joinedload(UserCharacter.weapon),
                selectinload(UserCharacter.artifacts).joinedload(UserArtifact.artifact_set),
            )
        )
        return await self._session.scalar(stmt)

    async def get_by_character_id(
        self, user_id: uuid.UUID, character_id: uuid.UUID
    ) -> UserCharacter | None:
        stmt = select(UserCharacter).where(
            UserCharacter.user_id == user_id,
            UserCharacter.character_id == character_id,
        )
        return await self._session.scalar(stmt)

    def add(self, instance: UserCharacter) -> None:
        self._session.add(instance)

    async def delete(self, instance: UserCharacter) -> None:
        await self._session.delete(instance)

    async def flush(self) -> None:
        await self._session.flush()

    async def commit(self) -> None:
        await self._session.commit()

    async def refresh(self, instance: UserCharacter) -> None:
        await self._session.refresh(instance)
