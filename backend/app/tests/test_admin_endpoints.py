"""Integration tests for RBAC via /admin endpoints."""

import uuid
from collections.abc import AsyncGenerator

import httpx
import pytest_asyncio
from sqlalchemy import select, update
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


@pytest_asyncio.fixture
async def admin_client(
    async_client: httpx.AsyncClient, db_session: AsyncSession
) -> AsyncGenerator[httpx.AsyncClient, None]:
    # Регистрируем админа
    resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "admin@example.com", "username": "admin", "password": "password123"},
    )
    assert resp.status_code == 201

    # Вручную меняем роль в БД на ADMIN
    user = await db_session.scalar(select(User).where(User.email == "admin@example.com"))
    assert user is not None
    user.role = Role.ADMIN
    await db_session.commit()

    # Re-login to update the cookie with the new role
    async_client.cookies.clear()
    await async_client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"}
    )
    yield async_client


class TestAdminEndpoints:
    async def test_update_user_role(
        self,
        admin_client: httpx.AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        # Создаем обычного юзера
        user = User(
            id=uuid.uuid4(),
            email="test@example.com",
            username="test",
            hashed_password="fake_hash",
            role=Role.USER,
        )
        db_session.add(user)
        await db_session.commit()

        # Меняем ему роль на premium
        resp = await admin_client.patch(
            f"/api/v1/admin/users/{user.id}/role",
            json={"role": "premium"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "premium"

    async def test_weights_management(self, admin_client: httpx.AsyncClient) -> None:
        # Получаем веса (создаются дефолтные, если нет)
        resp = await admin_client.get("/api/v1/admin/weights")
        assert resp.status_code == 200
        assert resp.json()["w_level"] == 0.2

        # Update weights with an invalid sum (should be 400)
        resp_bad = await admin_client.patch(
            "/api/v1/admin/weights",
            json={
                "w_level": 0.4,
                "w_talents": 0.4,
                "w_weapon": 0.4,
                "w_artifacts": 0.1,
                "w_friendship": 0.1,
            },  # Сумма 1.4
        )
        assert resp_bad.status_code == 400

        # Меняем веса правильно
        resp_ok = await admin_client.patch(
            "/api/v1/admin/weights",
            json={
                "w_level": 0.3,
                "w_talents": 0.3,
                "w_weapon": 0.2,
                "w_artifacts": 0.1,
                "w_friendship": 0.1,
            },
        )
        assert resp_ok.status_code == 200
        assert resp_ok.json()["w_level"] == 0.3

    async def test_create_and_delete_character(self, admin_client: httpx.AsyncClient) -> None:
        # Создаем персонажа
        resp = await admin_client.post(
            "/api/v1/admin/characters",
            json={"name": "Test Char", "element": "pyro", "weapon_type": "sword", "rarity": 5},
        )
        assert resp.status_code == 200
        char_id = resp.json()["id"]

        # Delete it
        resp_del = await admin_client.delete(f"/api/v1/admin/characters/{char_id}")
        assert resp_del.status_code == 200
