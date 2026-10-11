"""Additional integration tests for the tracker: crowns, custom stats,
level cap, isolation, and cascade rules.

Complements test_tracker_endpoints.py — focuses on edge cases and
non-formula fields rather than CRUD basics.
"""

import uuid
from collections.abc import AsyncGenerator
from typing import Any, cast

import httpx
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.enums import Element, WeaponType
from app.models.user import User
from app.models.user_character import UserCharacter
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
async def auth_client(
    async_client: httpx.AsyncClient,
) -> AsyncGenerator[httpx.AsyncClient, None]:
    resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "tester@example.com",
            "username": "tester",
            "password": "password123",
        },
    )
    assert resp.status_code == 201, resp.text
    yield async_client


async def _create_tracked(
    client: httpx.AsyncClient,
    character_id: uuid.UUID,
    **overrides: object,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"character_id": str(character_id)}
    payload.update(overrides)
    resp = await client.post("/api/v1/me/characters", json=payload)
    assert resp.status_code == 201, resp.text
    return cast(dict[str, Any], resp.json())


class TestCrownsUsed:
    async def test_no_crowns(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        data = await _create_tracked(
            auth_client,
            catalog_entities["character_id"],
            talent_normal=9,
            talent_skill=9,
            talent_burst=9,
        )
        assert data["crowns_used"] == 0

    async def test_one_crown(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        data = await _create_tracked(
            auth_client,
            catalog_entities["character_id"],
            talent_normal=10,
            talent_skill=9,
            talent_burst=9,
        )
        assert data["crowns_used"] == 1

    async def test_three_crowns(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        data = await _create_tracked(
            auth_client,
            catalog_entities["character_id"],
            talent_normal=13,
            talent_skill=13,
            talent_burst=13,
        )
        assert data["crowns_used"] == 3

    async def test_crowns_do_not_over_credit_progress(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        """Crowned talents (10-13) count as 9/9 in the progress formula."""
        base = await _create_tracked(
            auth_client,
            catalog_entities["character_id"],
            talent_normal=9,
            talent_skill=9,
            talent_burst=9,
        )
        assert base["progress"]["talents"] == 20.0  # sanity
        assert base["crowns_used"] == 0

        uc_id = base["id"]
        resp = await auth_client.patch(
            f"/api/v1/me/characters/{uc_id}",
            json={
                "talent_normal": 13,
                "talent_skill": 13,
                "talent_burst": 13,
            },
        )
        assert resp.status_code == 200
        # Talents component did not exceed 20.0 despite values of 13
        assert resp.json()["progress"]["talents"] == 20.0
        assert resp.json()["crowns_used"] == 3


class TestCustomStats:
    async def test_custom_stats_saved_and_returned(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        data = await _create_tracked(
            auth_client,
            catalog_entities["character_id"],
            custom_hp=30000,
            custom_atk=2100,
            custom_def=850,
            custom_em=61,
            custom_crit_rate=72.5,
            custom_crit_dmg=186.3,
            custom_energy_recharge=105.2,
            custom_elemental_dmg_bonus=46.6,
        )
        assert data["custom_hp"] == 30000
        assert data["custom_atk"] == 2100
        assert data["custom_def"] == 850
        assert data["custom_em"] == 61
        assert data["custom_crit_rate"] == 72.5
        assert data["custom_crit_dmg"] == 186.3
        assert data["custom_energy_recharge"] == 105.2
        assert data["custom_elemental_dmg_bonus"] == 46.6

    async def test_custom_stats_do_not_affect_progress(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        without = await _create_tracked(auth_client, catalog_entities["character_id"])
        uc_id = without["id"]
        resp = await auth_client.patch(
            f"/api/v1/me/characters/{uc_id}",
            json={"custom_hp": 999999, "custom_crit_rate": 200.0},
        )
        assert resp.status_code == 200
        # Progress unchanged
        assert resp.json()["progress"]["total"] == without["progress"]["total"]


class TestLevelCap:
    async def test_level_cap_90_default(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        data = await _create_tracked(auth_client, catalog_entities["character_id"], level=90)
        assert data["level_cap"] == 90
        assert data["progress"]["level"] == 20.0  # 90/90 * 20

    async def test_level_cap_100_does_not_reduce_progress(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        data = await _create_tracked(
            auth_client,
            catalog_entities["character_id"],
            level=90,
            level_cap=100,
        )
        # 90 is capped at PROGRESS_LEVEL_CAP (90), so it's 100% for the component
        assert data["progress"]["level"] == 20.0

    async def test_level_100_at_cap_100(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        data = await _create_tracked(
            auth_client,
            catalog_entities["character_id"],
            level=100,
            level_cap=100,
        )
        assert data["progress"]["level"] == 20.0

    async def test_invalid_level_cap_rejected(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await auth_client.post(
            "/api/v1/me/characters",
            json={
                "character_id": str(catalog_entities["character_id"]),
                "level_cap": 999,
            },
        )
        assert resp.status_code == 422


class TestMasterlessStellaFortuna:
    async def test_stella_saved(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        data = await _create_tracked(
            auth_client,
            catalog_entities["character_id"],
            masterless_stella_fortuna=3,
        )
        assert data["masterless_stella_fortuna"] == 3

    async def test_stella_does_not_affect_progress(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        baseline = await _create_tracked(auth_client, catalog_entities["character_id"])
        uc_id = baseline["id"]
        resp = await auth_client.patch(
            f"/api/v1/me/characters/{uc_id}",
            json={"masterless_stella_fortuna": 3},
        )
        assert resp.status_code == 200
        assert resp.json()["progress"]["total"] == baseline["progress"]["total"]

    async def test_stella_max_3(
        self,
        auth_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        resp = await auth_client.post(
            "/api/v1/me/characters",
            json={
                "character_id": str(catalog_entities["character_id"]),
                "masterless_stella_fortuna": 5,
            },
        )
        assert resp.status_code == 422


class TestUserIsolation:
    async def test_two_users_can_track_same_character(
        self,
        async_client: httpx.AsyncClient,
        db_session: AsyncSession,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        # User A
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "a@example.com",
                "username": "user_a",
                "password": "password123",
            },
        )
        resp_a = await async_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        assert resp_a.status_code == 201
        async_client.cookies.clear()

        # User B tracks the SAME character
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "b@example.com",
                "username": "user_b",
                "password": "password123",
            },
        )
        resp_b = await async_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        assert resp_b.status_code == 201

        # Two distinct rows in DB
        rows = await db_session.scalars(
            select(UserCharacter).where(
                UserCharacter.character_id == catalog_entities["character_id"]
            )
        )
        assert len(list(rows.all())) == 2

    async def test_user_cannot_patch_other_users_record(
        self,
        async_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        # User A creates
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "a@example.com",
                "username": "user_a",
                "password": "password123",
            },
        )
        create = await async_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        uc_id = create.json()["id"]
        async_client.cookies.clear()

        # User B logs in
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "b@example.com",
                "username": "user_b",
                "password": "password123",
            },
        )

        # B tries to PATCH A's record
        resp = await async_client.patch(
            f"/api/v1/me/characters/{uc_id}",
            json={"level": 99},
        )
        assert resp.status_code == 404

    async def test_user_cannot_delete_other_users_record(
        self,
        async_client: httpx.AsyncClient,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "a@example.com",
                "username": "user_a",
                "password": "password123",
            },
        )
        create = await async_client.post(
            "/api/v1/me/characters",
            json={"character_id": str(catalog_entities["character_id"])},
        )
        uc_id = create.json()["id"]
        async_client.cookies.clear()

        await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "b@example.com",
                "username": "user_b",
                "password": "password123",
            },
        )
        resp = await async_client.delete(f"/api/v1/me/characters/{uc_id}")
        assert resp.status_code == 404


class TestDeleteUserCascade:
    async def test_deleting_user_cascades_to_user_characters(
        self,
        auth_client: httpx.AsyncClient,
        db_session: AsyncSession,
        catalog_entities: dict[str, uuid.UUID],
    ) -> None:
        await _create_tracked(auth_client, catalog_entities["character_id"])

        user = await db_session.scalar(select(User).where(User.email == "tester@example.com"))
        assert user is not None

        # Manually delete the user (no endpoint for this yet; tests cascade).
        await db_session.delete(user)
        await db_session.commit()

        # user_characters should be gone via ON DELETE CASCADE
        rows = await db_session.scalars(select(UserCharacter))
        assert list(rows.all()) == []
