"""Integration tests for RBAC via /admin endpoints."""

from collections.abc import AsyncGenerator

import httpx
import pytest_asyncio
from sqlalchemy import update
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)

from app.models.enums import Role
from app.models.user import User


def _register_payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "email": "user@example.com",
        "username": "user",
        "password": "password123",
    }
    base.update(overrides)
    return base


@pytest_asyncio.fixture
async def _promote_to_admin(
    _engine: AsyncEngine,
) -> AsyncGenerator[None, None]:
    """Marker fixture — no setup, used to signal test dependency on _engine."""
    yield


async def _promote(email: str, engine: AsyncEngine) -> None:
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        await session.execute(update(User).where(User.email == email).values(role=Role.ADMIN))
        await session.commit()


class TestAdminEndpointAuth:
    async def test_no_auth_returns_401(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.get("/api/v1/admin/users")
        assert resp.status_code == 401

    async def test_regular_user_returns_403(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        resp = await async_client.get("/api/v1/admin/users")
        assert resp.status_code == 403
        assert "permission" in resp.json()["detail"].lower()


class TestAdminEndpointAccess:
    async def test_admin_can_list_users(
        self,
        async_client: httpx.AsyncClient,
        _engine: AsyncEngine,
    ) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        await _promote("user@example.com", _engine)

        resp = await async_client.get("/api/v1/admin/users")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["email"] == "user@example.com"
        assert data[0]["role"] == "admin"
        assert "hashed_password" not in data[0]
