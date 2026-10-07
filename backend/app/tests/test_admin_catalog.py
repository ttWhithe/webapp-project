"""Integration tests for admin catalog PATCH endpoints."""

import uuid

import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.enums import Element, Role, WeaponType
from app.models.user import User
from app.models.weapon import Weapon


@pytest_asyncio.fixture
async def catalog_entities(db_session: AsyncSession) -> dict[str, uuid.UUID]:
    char = Character(
        id=uuid.uuid4(),
        external_id=10000046,
        slug="hu-tao",
        name="Hu Tao",
        element=Element.PYRO,
        weapon_type=WeaponType.POLEARM,
        rarity=5,
        icon_url="https://old.example.com/hutao.png",
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
    return {
        "character_id": char.id,
        "weapon_id": wep.id,
        "set_id": aset.id,
    }


@pytest_asyncio.fixture
async def admin_client(
    async_client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> httpx.AsyncClient:
    """AsyncClient registered + promoted to admin."""
    resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@example.com",
            "username": "adminuser",
            "password": "password123",
        },
    )
    assert resp.status_code == 201

    user = await db_session.get(User, uuid.UUID(resp.json()["id"]))
    assert user is not None
    user.role = Role.ADMIN
    await db_session.commit()

    # Re-login so JWT has role=admin
    async_client.cookies.clear()
    await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    return async_client


@pytest_asyncio.fixture
async def regular_client(
    async_client: httpx.AsyncClient,
) -> httpx.AsyncClient:
    resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "user@example.com",
            "username": "regular",
            "password": "password123",
        },
    )
    assert resp.status_code == 201
    return async_client


class TestAdminAccess:
    async def test_unauthorized_returns_401(
        self,
        async_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await async_client.patch(
            f"/api/v1/admin/characters/{catalog_entities['character_id']}",
            json={"icon_url": "https://new.example.com/x.png"},
        )
        assert resp.status_code == 401

    async def test_regular_user_returns_403(
        self,
        regular_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await regular_client.patch(
            f"/api/v1/admin/characters/{catalog_entities['character_id']}",
            json={"icon_url": "https://new.example.com/x.png"},
        )
        assert resp.status_code == 403

    async def test_admin_can_list_characters(
        self,
        admin_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await admin_client.get("/api/v1/admin/characters")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1


class TestAdminCharacterUpdate:
    async def test_update_icon_url(
        self,
        admin_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        char_id = catalog_entities["character_id"]
        new_url = "https://new.example.com/hutao.png"

        resp = await admin_client.patch(
            f"/api/v1/admin/characters/{char_id}",
            json={"icon_url": new_url},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["icon_url"] == new_url
        # unchanged fields preserved
        assert resp.json()["name"] == "Hu Tao"
        assert resp.json()["slug"] == "hu-tao"

    async def test_update_name_ru(
        self,
        admin_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        char_id = catalog_entities["character_id"]
        resp = await admin_client.patch(
            f"/api/v1/admin/characters/{char_id}",
            json={"name_ru": "Hu Tao RU"},
        )
        assert resp.status_code == 200
        assert resp.json()["name_ru"] == "Hu Tao RU"

    async def test_partial_update_does_not_wipe_other_fields(
        self,
        admin_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        char_id = catalog_entities["character_id"]
        # First set name_ru and region
        await admin_client.patch(
            f"/api/v1/admin/characters/{char_id}",
            json={"name_ru": "Hu Tao RU", "region": "Liyue"},
        )
        # Then update only icon_url
        resp = await admin_client.patch(
            f"/api/v1/admin/characters/{char_id}",
            json={"icon_url": "https://new.example.com/x.png"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name_ru"] == "Hu Tao RU"
        assert data["region"] == "Liyue"
        assert data["icon_url"] == "https://new.example.com/x.png"

    async def test_unknown_character_returns_404(
        self,
        admin_client: httpx.AsyncClient,
    ) -> None:
        resp = await admin_client.patch(
            f"/api/v1/admin/characters/{uuid.uuid4()}",
            json={"icon_url": "https://x.example.com/x.png"},
        )
        assert resp.status_code == 404

    async def test_invalid_rarity_returns_422(
        self,
        admin_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await admin_client.patch(
            f"/api/v1/admin/characters/{catalog_entities['character_id']}",
            json={"rarity": 99},
        )
        assert resp.status_code == 422


class TestAdminWeaponUpdate:
    async def test_update_icon_url(
        self,
        admin_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        wid = catalog_entities["weapon_id"]
        resp = await admin_client.patch(
            f"/api/v1/admin/weapons/{wid}",
            json={"icon_url": "https://new.example.com/homa.png"},
        )
        assert resp.status_code == 200
        assert resp.json()["icon_url"] == "https://new.example.com/homa.png"

    async def test_unknown_weapon_returns_404(
        self,
        admin_client: httpx.AsyncClient,
    ) -> None:
        resp = await admin_client.patch(
            f"/api/v1/admin/weapons/{uuid.uuid4()}",
            json={"icon_url": "https://x.example.com/x.png"},
        )
        assert resp.status_code == 404


class TestAdminArtifactSetUpdate:
    async def test_update_name_ru(
        self,
        admin_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        sid = catalog_entities["set_id"]
        resp = await admin_client.patch(
            f"/api/v1/admin/artifact-sets/{sid}",
            json={"name_ru": "Crimson Witch RU"},
        )
        assert resp.status_code == 200
        assert resp.json()["name_ru"] == "Crimson Witch RU"

    async def test_unknown_set_returns_404(
        self,
        admin_client: httpx.AsyncClient,
    ) -> None:
        resp = await admin_client.patch(
            f"/api/v1/admin/artifact-sets/{uuid.uuid4()}",
            json={"name_ru": "x"},
        )
        assert resp.status_code == 404
