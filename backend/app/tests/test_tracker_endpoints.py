"""Integration tests for /me/characters."""

import uuid
from collections.abc import AsyncGenerator

import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.enums import Element, WeaponType
from app.models.weapon import Weapon

VALID_PASSWORD = "password123"


def _user_payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "email": "tester@example.com",
        "username": "tester",
        "password": VALID_PASSWORD,
    }
    base.update(overrides)
    return base


@pytest_asyncio.fixture
async def catalog_entities(db_session: AsyncSession) -> dict[str, uuid.UUID]:
    """Seed a character, a weapon, and an artifact set. Returns their IDs."""
    char = Character(
        id=uuid.uuid4(),
        external_id=10000046,
        slug="hu-tao",
        name="Hu Tao",
        element=Element.PYRO,
        weapon_type=WeaponType.POLEARM,
        rarity=5,
    )
    wep = Weapon(
        id=uuid.uuid4(),
        external_id=13501,
        slug="staff-of-homa",
        name="Staff of Homa",
        weapon_type=WeaponType.POLEARM,
        rarity=5,
    )
    aset = ArtifactSet(
        id=uuid.uuid4(),
        external_id=15001,
        slug="crimson-witch-of-flames",
        name="Crimson Witch of Flames",
    )
    db_session.add_all([char, wep, aset])
    await db_session.commit()
    return {"character_id": char.id, "weapon_id": wep.id, "set_id": aset.id}


@pytest_asyncio.fixture
async def auth_client(async_client: httpx.AsyncClient) -> AsyncGenerator[httpx.AsyncClient, None]:
    """AsyncClient with a registered user (cookies in jar)."""
    resp = await async_client.post("/api/v1/auth/register", json=_user_payload())
    assert resp.status_code == 201, resp.text
    yield async_client


class TestCreate:
    async def test_create_minimal(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await auth_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["character"]["slug"] == "hu-tao"
        assert data["level"] == 1
        assert data["progress"]["total"] > 0  # 1/90 * 20 + 1/9/3 * 20 + 1/10 * 20 ≈ 4.4

    async def test_create_full(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await auth_client.post(
            "/api/v1/me/characters",
            json={
                "character_id": str(catalog_entities["character_id"]),
                "level": 90,
                "friendship": 10,
                "talent_normal": 9,
                "talent_skill": 9,
                "talent_burst": 9,
                "weapon_id": str(catalog_entities["weapon_id"]),
                "weapon_level": 90,
                "weapon_refinement": 5,
                "custom_hp": 30000,
                "custom_crit_rate": 72.5,
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["level"] == 90
        assert data["weapon"]["slug"] == "staff-of-homa"
        assert data["custom_hp"] == 30000
        assert data["custom_crit_rate"] == 72.5
        # Level+friendship+talents+weapon = 4 * 20 = 80 (no artifacts yet)
        assert data["progress"]["total"] == 80.0

    async def test_create_with_artifacts(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        set_id = str(catalog_entities["set_id"])
        artifacts = [
            {"slot": "flower", "set_id": set_id, "rarity": 5, "level": 20},
            {"slot": "plume", "set_id": set_id, "rarity": 5, "level": 20},
        ]
        resp = await auth_client.post(
            "/api/v1/me/characters",
            json={
                "character_id": str(catalog_entities["character_id"]),
                "artifacts": artifacts,
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert len(data["artifacts"]) == 2
        # 2/5 artifacts maxed = 8.0 pts in artifact component
        assert data["progress"]["artifacts"] == 8.0

    async def test_create_duplicate_returns_409(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        payload = {"character_id": str(catalog_entities["character_id"])}
        await auth_client.post("/api/v1/me/characters", json=payload)
        resp = await auth_client.post("/api/v1/me/characters", json=payload)
        assert resp.status_code == 409

    async def test_create_unknown_character_returns_404(
        self,
        auth_client: httpx.AsyncClient,
    ) -> None:
        resp = await auth_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 404

    async def test_create_without_auth_returns_401(
        self,
        async_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await async_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        assert resp.status_code == 401


class TestList:
    async def test_empty_list(self, auth_client: httpx.AsyncClient) -> None:
        resp = await auth_client.get("/api/v1/me/characters")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_after_create(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        await auth_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        resp = await auth_client.get("/api/v1/me/characters")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["character"]["slug"] == "hu-tao"
        assert "progress" in items[0]


class TestGet:
    async def test_get_detail(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        create = await auth_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        uc_id = create.json()["id"]

        resp = await auth_client.get(f"/api/v1/me/characters/{uc_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == uc_id
        assert data["progress"]["total"] >= 0
        assert data["artifacts"] == []

    async def test_get_nonexistent_returns_404(self, auth_client: httpx.AsyncClient) -> None:
        resp = await auth_client.get(f"/api/v1/me/characters/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestUpdate:
    async def test_patch_level(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        create = await auth_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        uc_id = create.json()["id"]

        resp = await auth_client.patch(
            f"/api/v1/me/characters/{uc_id}",
            json={"level": 89, "friendship": 3},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["level"] == 89
        assert data["friendship"] == 3

    async def test_patch_replaces_artifacts(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        create = await auth_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        uc_id = create.json()["id"]
        set_id = str(catalog_entities["set_id"])

        resp = await auth_client.patch(
            f"/api/v1/me/characters/{uc_id}",
            json={
                "artifacts": [
                    {"slot": "flower", "set_id": set_id, "rarity": 5, "level": 20},
                ]
            },
        )
        assert resp.status_code == 200
        assert len(resp.json()["artifacts"]) == 1

        # Patching artifacts to [] should clear them
        resp2 = await auth_client.patch(
            f"/api/v1/me/characters/{uc_id}",
            json={"artifacts": []},
        )
        assert resp2.status_code == 200
        assert resp2.json()["artifacts"] == []

    async def test_patch_unknown_returns_404(self, auth_client: httpx.AsyncClient) -> None:
        resp = await auth_client.patch(
            f"/api/v1/me/characters/{uuid.uuid4()}",
            json={"level": 50},
        )
        assert resp.status_code == 404


class TestDelete:
    async def test_delete(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        create = await auth_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        uc_id = create.json()["id"]

        resp = await auth_client.delete(f"/api/v1/me/characters/{uc_id}")
        assert resp.status_code == 204

        resp2 = await auth_client.get(f"/api/v1/me/characters/{uc_id}")
        assert resp2.status_code == 404

    async def test_delete_unknown_returns_404(self, auth_client: httpx.AsyncClient) -> None:
        resp = await auth_client.delete(f"/api/v1/me/characters/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestIsolation:
    async def test_user_cannot_see_other_users_characters(
        self,
        async_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        # User A creates
        await async_client.post("/api/v1/auth/register", json=_user_payload())
        create = await async_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        uc_id = create.json()["id"]
        async_client.cookies.clear()

        # User B logs in
        await async_client.post(
            "/api/v1/auth/register",
            json=_user_payload(email="other@example.com", username="other"),
        )

        # User B tries to access A's record
        resp = await async_client.get(f"/api/v1/me/characters/{uc_id}")
        assert resp.status_code == 404
