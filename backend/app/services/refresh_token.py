"""Refresh token service: issue, verify, rotate, revoke.

Design:
    Token format: "<jti>.<secret>"
        - jti: public short identifier, used as part of the Redis key
        - secret: random part, verified by comparing sha256(secret) with stored hash

    Storage:
        Key: refresh:{user_id}:{jti}
        Value: sha256(secret).hexdigest()
        TTL: settings.refresh_token_expire_days

    Rotation:
        On every successful refresh, the old token is revoked and a new one issued.
        This prevents replay attacks: if a leaked token has already been used, it is
        no longer valid.
"""

import hashlib
import secrets
import uuid
from typing import cast

from redis.asyncio import Redis

from app.core.config import settings

_KEY_PREFIX = "refresh"


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _key(user_id: uuid.UUID, jti: str) -> str:
    return f"{_KEY_PREFIX}:{user_id}:{jti}"


def _ttl_seconds() -> int:
    return settings.refresh_token_expire_days * 24 * 60 * 60


class RefreshTokenService:
    """Redis-backed refresh token storage with rotation."""

    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    async def issue(self, user_id: uuid.UUID) -> str:
        """Create a new refresh token for the user, store its hash, return the raw token."""
        jti = secrets.token_urlsafe(16)
        secret = secrets.token_urlsafe(32)
        await self._redis.set(
            _key(user_id, jti),
            _hash_secret(secret),
            ex=_ttl_seconds(),
        )
        return f"{jti}.{secret}"

    async def verify(self, user_id: uuid.UUID, token: str) -> bool:
        """Check that the token exists and matches the stored hash."""
        parsed = self._parse(token)
        if parsed is None:
            return False
        jti, secret = parsed
        stored = cast(str | None, await self._redis.get(_key(user_id, jti)))
        if stored is None:
            return False
        return secrets.compare_digest(stored, _hash_secret(secret))

    async def rotate(self, user_id: uuid.UUID, old_token: str) -> str | None:
        """Revoke the old token and issue a new one.

        Returns the new token if the old one was valid, otherwise None.
        """
        if not await self.verify(user_id, old_token):
            return None
        parsed = self._parse(old_token)
        assert parsed is not None  # verify already ensured it parses
        old_jti, _ = parsed
        await self._redis.delete(_key(user_id, old_jti))
        return await self.issue(user_id)

    async def revoke(self, user_id: uuid.UUID, token: str) -> None:
        """Revoke a single token (logout from current device)."""
        parsed = self._parse(token)
        if parsed is None:
            return
        jti, _ = parsed
        await self._redis.delete(_key(user_id, jti))

    async def revoke_all(self, user_id: uuid.UUID) -> int:
        """Revoke every refresh token of the user (logout from all devices).

        Returns the number of tokens revoked.
        """
        pattern = f"{_KEY_PREFIX}:{user_id}:*"
        deleted = 0
        async for key in self._redis.scan_iter(match=pattern):
            await self._redis.delete(key)
            deleted += 1
        return deleted

    @staticmethod
    def _parse(token: str) -> tuple[str, str] | None:
        if "." not in token:
            return None
        jti, secret = token.split(".", 1)
        if not jti or not secret:
            return None
        return jti, secret
