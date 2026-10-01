"""Auth domain service: register, authenticate."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user import UserRepository


class EmailAlreadyExistsError(Exception):
    """Raised when registering with an already-used email."""


class UsernameAlreadyExistsError(Exception):
    """Raised when registering with an already-used username."""


class AuthService:
    """Domain operations around user authentication."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._users = UserRepository(session)

    async def register(
        self,
        *,
        email: str,
        username: str,
        password: str,
    ) -> User:
        """Create a new user. Commits the transaction."""
        if await self._users.get_by_email(email) is not None:
            raise EmailAlreadyExistsError(email)
        if await self._users.get_by_username(username) is not None:
            raise UsernameAlreadyExistsError(username)

        user = await self._users.create(
            email=email,
            username=username,
            hashed_password=hash_password(password),
        )
        await self._session.commit()
        return user

    async def authenticate(self, *, email: str, password: str) -> User | None:
        """Return the user if credentials are valid, otherwise None."""
        user = await self._users.get_by_email(email)
        if user is None:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
