import os
from collections.abc import AsyncGenerator

import asyncpg
import httpx
import pytest_asyncio
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-do-not-use-in-prod-32chars")


from app.core.config import settings
from app.db.base_class import Base
from app.db.redis import get_redis
from app.db.session import get_db
from app.main import app


async def _ensure_database_exists(database_url: str) -> None:
    """Создаёт БД, если её ещё нет.

    Подключается к служебной БД ``postgres`` (она существует всегда
    в любом стандартном инстансе PostgreSQL) и делает ``CREATE DATABASE``
    только если нужной базы не нашлось. Идемпотентно.
    """
    url = make_url(database_url)
    target = url.database
    if not target:
        raise RuntimeError(f"Database name is missing in the test DB URL: {database_url!r}")

    try:
        conn = await asyncpg.connect(
            user=url.username,
            password=url.password,
            host=url.host or "localhost",
            port=url.port or 5432,
            database="postgres",
            timeout=10,
        )
    except (OSError, asyncpg.PostgresError) as exc:
        raise RuntimeError(
            f"Failed to connect to service DB 'postgres' to check/create '{target}': {exc}"
        ) from exc

    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", target)
        if not exists:
            # asyncpg doesn't support binding params in CREATE DATABASE,
            # and identifier-escaping is safe here: the name comes
            # from make_url and does not contain quotes.
            await conn.execute(f'CREATE DATABASE "{target}"')
    finally:
        await conn.close()


@pytest_asyncio.fixture(scope="session")
async def _engine() -> AsyncGenerator[AsyncEngine, None]:
    # Docker entrypoint создаёт только POSTGRES_DB (= gpt_tracker).
    # Если тесты идут в отдельную БД — создадим её при необходимости.
    if settings.test_database_url:
        await _ensure_database_exists(settings.test_database_url)
    else:
        import warnings

        warnings.warn(
            "TEST_DATABASE_URL не задан — тесты работают против основной БД "
            "(database_url). Это уничтожит данные при cleanup.",
            RuntimeWarning,
            stacklevel=1,
        )

    test_url = settings.test_database_url or settings.database_url
    engine = create_async_engine(test_url, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """DB session with cleanup after each test.

    Cleans up catalog tables after the test because some tests commit, and we
    want each test to start with an empty catalog.
    """
    session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with _engine.begin() as conn:
        await conn.execute(text("DELETE FROM users"))
        await conn.execute(text("DELETE FROM characters"))
        await conn.execute(text("DELETE FROM weapons"))
        await conn.execute(text("DELETE FROM artifact_sets"))
        await conn.execute(text("DELETE FROM progress_weights"))
        await conn.execute(text("DELETE FROM payments"))
        await conn.execute(text("DELETE FROM subscriptions"))


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
        await conn.execute(text("DELETE FROM characters"))
        await conn.execute(text("DELETE FROM weapons"))
        await conn.execute(text("DELETE FROM artifact_sets"))
        await conn.execute(text("DELETE FROM progress_weights"))
        await conn.execute(text("DELETE FROM payments"))
        await conn.execute(text("DELETE FROM subscriptions"))
        await conn.execute(text("DELETE FROM user_artifacts"))
        await conn.execute(text("DELETE FROM user_characters"))

    app.dependency_overrides.clear()
