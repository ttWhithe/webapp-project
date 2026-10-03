"""Redis-backed JSON cache service.

Used for the public catalog (characters, weapons, artifacts), which is
read-heavy and rarely changes. Keys are namespaced by resource.

Invalidation: after catalog sync, we call `delete_pattern("catalog:*")`.
"""

import hashlib
import json
from typing import Any

from redis.asyncio import Redis


class CacheService:
    """Thin wrapper around Redis with JSON serialization."""

    def __init__(self, redis: Redis, prefix: str = "catalog") -> None:
        self._redis = redis
        self._prefix = prefix

    def _key(self, *parts: str) -> str:
        return ":".join([self._prefix, *parts])

    async def get_json(self, key: str) -> Any | None:
        raw = await self._redis.get(self._key(key))
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # Corrupted cache entry — drop it and let the caller recompute.
            await self._redis.delete(self._key(key))
            return None

    async def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        serialized = json.dumps(value, default=str)
        await self._redis.set(self._key(key), serialized, ex=ttl_seconds)

    async def delete(self, key: str) -> None:
        await self._redis.delete(self._key(key))

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching `<prefix>:<pattern>`. Returns count deleted."""
        full_pattern = f"{self._prefix}:{pattern}"
        deleted = 0
        async for key in self._redis.scan_iter(match=full_pattern):
            await self._redis.delete(key)
            deleted += 1
        return deleted

    @staticmethod
    def hash_query(params: dict[str, Any]) -> str:
        """Stable hash of query params — used as part of the cache key.

        Sorted, JSON-encoded, then SHA-1 (truncated). Consistent across runs.
        """
        payload = json.dumps(params, sort_keys=True, default=str)
        return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]
