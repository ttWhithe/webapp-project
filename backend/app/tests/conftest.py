import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from redis.asyncio import Redis

os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-do-not-use-in-prod-32chars")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://gpt:gpt_secret@localhost:5432/gpt_tracker",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from app.core.config import settings


@pytest_asyncio.fixture
async def redis_client() -> AsyncGenerator[Redis, None]:
    """Real Redis client, using a dedicated test DB.

    Flushes the DB before each test to guarantee isolation.
    """
    client: Redis = Redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )
    await client.flushdb()
    try:
        yield client
    finally:
        await client.flushdb()
        await client.aclose()
