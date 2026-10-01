import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import Role
from app.models.user import User


class UserRepository:
    """Data-access layer for the User model."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        return await self._session.scalar(stmt)

    async def get_by_username(self, username: str) -> User | None:
        stmt = select(User).where(User.username == username)
        return await self._session.scalar(stmt)

    async def create(
        self,
        *,
        email: str,
        username: str,
        hashed_password: str,
        role: Role = Role.USER,
    ) -> User:
        user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            role=role,
        )
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user
