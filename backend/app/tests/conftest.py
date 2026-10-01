import os
from collections.abc import AsyncGenerator

import httpx
import pytest_asyncio
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
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
from app.db.redis import get_redis
from app.db.session import get_db
from app.main import app


@pytest_asyncio.fixture(scope="session")
async def _engine() -> AsyncGenerator[AsyncEngine, None]:
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
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


@pytest_asyncio.fixture
async def async_client(
    _engine: AsyncEngine,
    redis_client: Redis,
) -> AsyncGenerator[httpx.AsyncClient, None]:
    """httpx client bound to the FastAPI app, with DB and Redis overridden
    to point at the test fixtures (real Postgres + real Redis)."""
    session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def override_get_redis() -> AsyncGenerator[Redis, None]:
        yield redis_client

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        yield client

    async with _engine.begin() as conn:
        await conn.execute(text("DELETE FROM users"))
    app.dependency_overrides.clear()
