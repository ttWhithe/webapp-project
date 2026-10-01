"""Shared FastAPI dependencies: DB session, Redis, current user."""

import uuid
from typing import Annotated

from app.core.security import decode_access_token
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.user import User
from app.repositories.user import UserRepository
from app.services.auth import AuthService
from app.services.refresh_token import RefreshTokenService
from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


def get_user_repo(db: Annotated[AsyncSession, Depends(get_db)]) -> UserRepository:
    return UserRepository(db)


def get_refresh_service(
    redis: Annotated[Redis, Depends(get_redis)],
) -> RefreshTokenService:
    return RefreshTokenService(redis)


def get_auth_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthService:
    return AuthService(db)


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


async def get_current_user(
    access_token: Annotated[str | None, Cookie(alias=ACCESS_COOKIE)] = None,
    repo: Annotated[UserRepository, Depends(get_user_repo)] = None,  # type: ignore[assignment]
) -> User:
    """Extract the current user from the access_token cookie."""
    if not access_token:
        raise _credentials_exception()

    try:
        payload = decode_access_token(access_token)
    except JWTError as exc:
        raise _credentials_exception() from exc

    if payload.get("type") != "access":
        raise _credentials_exception()

    sub = payload.get("sub")
    if not sub:
        raise _credentials_exception()

    try:
        user_id = uuid.UUID(sub)
    except (ValueError, TypeError) as exc:
        raise _credentials_exception() from exc

    user = await repo.get_by_id(user_id)
    if user is None:
        raise _credentials_exception()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
