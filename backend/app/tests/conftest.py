import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-do-not-use-in-prod-32chars")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://gpt:gpt_secret@localhost:5432/gpt_tracker",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from app.core.config import settings
from app.db.base_class import Base


@pytest_asyncio.fixture(scope="session")
async def _engine():  # type: ignore[no-untyped-def]
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(_engine) -> AsyncGenerator[AsyncSession, None]:  # type: ignore[no-untyped-def]
    """DB session with automatic rollback after each test."""
    session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def redis_client() -> AsyncGenerator[Redis, None]:
    """Real Redis client, using a dedicated test DB."""
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
