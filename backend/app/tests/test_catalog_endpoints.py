"""Integration tests for public catalog endpoints."""

import uuid

import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.enums import Element, WeaponType
from app.models.weapon import Weapon


def _make_character(
    *,
    slug: str = "hu-tao",
    name: str = "Hu Tao",
    element: Element = Element.PYRO,
    weapon_type: WeaponType = WeaponType.POLEARM,
    rarity: int = 5,
    external_id: int = 10000046,
) -> Character:
    return Character(
        id=uuid.uuid4(),
        external_id=external_id,
        slug=slug,
        name=name,
        element=element,
        weapon_type=weapon_type,
        rarity=rarity,
    )


def _make_weapon(
    *,
    slug: str = "staff-of-homa",
    name: str = "Staff of Homa",
    weapon_type: WeaponType = WeaponType.POLEARM,
    rarity: int = 5,
    external_id: int = 13501,
) -> Weapon:
    return Weapon(
        id=uuid.uuid4(),
        external_id=external_id,
        slug=slug,
        name=name,
        weapon_type=weapon_type,
        rarity=rarity,
        base_atk=45.9,
        main_stat="CRIT DMG",
    )


@pytest_asyncio.fixture
async def seeded(db_session: AsyncSession) -> None:
    """Seed a small catalog for read tests, commit so httpx sees the data."""
    db_session.add_all(
        [
            _make_character(
                slug="hu-tao",
                name="Hu Tao",
                element=Element.PYRO,
                weapon_type=WeaponType.POLEARM,
                rarity=5,
                external_id=10000046,
            ),
            _make_character(
                slug="xingqiu",
                name="Xingqiu",
                element=Element.HYDRO,
                weapon_type=WeaponType.SWORD,
                rarity=4,
                external_id=10000025,
            ),
            _make_weapon(
                slug="staff-of-homa",
                name="Staff of Homa",
                weapon_type=WeaponType.POLEARM,
                rarity=5,
                external_id=13501,
            ),
            _make_weapon(
                slug="sacrificial-sword",
                name="Sacrificial Sword",
                weapon_type=WeaponType.SWORD,
                rarity=4,
                external_id=11502,
            ),
            ArtifactSet(
                id=uuid.uuid4(),
                external_id=15001,
                slug="crimson-witch-of-flames",
                name="Crimson Witch of Flames",
            ),
        ]
    )
    await db_session.commit()


class TestListCharacters:
    async def test_empty_catalog(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.get("/api/v1/characters")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_list_returns_seeded(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/characters")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        names = {item["name"] for item in data["items"]}
        assert names == {"Hu Tao", "Xingqiu"}

    async def test_filter_by_element(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/characters?element=pyro")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["slug"] == "hu-tao"

    async def test_filter_by_rarity(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/characters?rarity=4")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    async def test_filter_by_weapon_type(
        self, async_client: httpx.AsyncClient, seeded: None
    ) -> None:
        resp = await async_client.get("/api/v1/characters?weapon_type=sword")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    async def test_pagination(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/characters?limit=1&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 1
        assert data["limit"] == 1
        assert data["offset"] == 0

    async def test_invalid_sort_rejected(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.get("/api/v1/characters?sort=bogus")
        assert resp.status_code == 422

    async def test_invalid_limit_rejected(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.get("/api/v1/characters?limit=9999")
        assert resp.status_code == 422


class TestGetCharacter:
    async def test_get_by_slug(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/characters/hu-tao")
        assert resp.status_code == 200
        data = resp.json()
        assert data["slug"] == "hu-tao"
        assert data["name"] == "Hu Tao"
        assert data["element"] == "pyro"

    async def test_get_missing_returns_404(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.get("/api/v1/characters/nonexistent")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


class TestListWeapons:
    async def test_list_returns_seeded(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/weapons")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2

    async def test_filter_by_rarity(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/weapons?rarity=5")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1


class TestGetWeapon:
    async def test_get_by_slug(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/weapons/staff-of-homa")
        assert resp.status_code == 200
        assert resp.json()["slug"] == "staff-of-homa"

    async def test_get_missing_returns_404(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.get("/api/v1/weapons/nonexistent")
        assert resp.status_code == 404


class TestListArtifactSets:
    async def test_list_returns_seeded(self, async_client: httpx.AsyncClient, seeded: None) -> None:
        resp = await async_client.get("/api/v1/artifact-sets")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["slug"] == "crimson-witch-of-flames"
