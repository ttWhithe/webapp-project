"""Tests for GenshinDbClient using respx to mock httpx."""

import httpx
import pytest
import respx

from app.services.genshin_db_client import GenshinDbClient, GenshinDbClientError

BASE = "https://genshin-db-api.vercel.app/api/v5"


def _url(resource: str) -> str:
    return f"{BASE}/{resource}"


class TestListEndpoints:
    async def test_list_characters_returns_names(self) -> None:
        with respx.mock:
            respx.get(url__regex=rf"{BASE}/characters.*").mock(
                return_value=httpx.Response(200, json=["Hu Tao", "Zhongli"])
            )
            async with GenshinDbClient() as client:
                names = await client.list_characters()
        assert names == ["Hu Tao", "Zhongli"]

    async def test_list_weapons_returns_names(self) -> None:
        with respx.mock:
            respx.get(url__regex=rf"{BASE}/weapons.*").mock(
                return_value=httpx.Response(200, json=["Staff of Homa"])
            )
            async with GenshinDbClient() as client:
                names = await client.list_weapons()
        assert names == ["Staff of Homa"]

    async def test_list_returns_empty_array(self) -> None:
        with respx.mock:
            respx.get(url__regex=rf"{BASE}/characters.*").mock(
                return_value=httpx.Response(200, json=[])
            )
            async with GenshinDbClient() as client:
                names = await client.list_characters()
        assert names == []

    async def test_list_with_non_list_response_raises(self) -> None:
        with respx.mock:
            respx.get(url__regex=rf"{BASE}/characters.*").mock(
                return_value=httpx.Response(200, json={"unexpected": "dict"})
            )
            async with GenshinDbClient() as client:
                with pytest.raises(GenshinDbClientError):
                    await client.list_characters()


class TestDetailEndpoints:
    async def test_get_character_parses_model(self) -> None:
        with respx.mock:
            respx.get(url__regex=rf"{BASE}/characters.*").mock(
                return_value=httpx.Response(
                    200,
                    json={
                        "id": 10000046,
                        "name": "Hu Tao",
                        "title": "Fragrance in Thaw",
                        "elementType": "ELEMENT_PYRO",
                        "elementText": "Pyro",
                        "weaponType": "WEAPON_POLEARM",
                        "weaponText": "Polearm",
                        "rarity": 5,
                        "region": "Liyue",
                        "birthdaymmdd": "7/15",
                        "images": {
                            "card": "https://example.com/card.png",
                            "portrait": "https://example.com/portrait.png",
                        },
                        "version": "1.3",
                    },
                )
            )
            async with GenshinDbClient() as client:
                char = await client.get_character("Hu Tao")
        assert char is not None
        assert char.id == 10000046
        assert char.name == "Hu Tao"
        assert char.element_type == "ELEMENT_PYRO"
        assert char.weapon_type == "WEAPON_POLEARM"
        assert char.rarity == 5
        assert char.images.card == "https://example.com/card.png"

    async def test_get_character_404_returns_none(self) -> None:
        with respx.mock:
            respx.get(url__regex=rf"{BASE}/characters.*").mock(
                return_value=httpx.Response(404, json={"detail": "not found"})
            )
            async with GenshinDbClient() as client:
                char = await client.get_character("Nonexistent")
        assert char is None

    async def test_get_character_empty_body_returns_none(self) -> None:
        with respx.mock:
            respx.get(url__regex=rf"{BASE}/characters.*").mock(
                return_value=httpx.Response(200, text="")
            )
            async with GenshinDbClient() as client:
                char = await client.get_character("Something")
        assert char is None


class TestRetry:
    async def test_retry_on_500_then_success(self) -> None:
        with respx.mock:
            route = respx.get(url__regex=rf"{BASE}/characters.*")
            route.side_effect = [
                httpx.Response(500, json={"error": "server"}),
                httpx.Response(200, json=["Hu Tao"]),
            ]
            async with GenshinDbClient() as client:
                names = await client.list_characters()
        assert names == ["Hu Tao"]
        assert route.call_count == 2

    async def test_retry_exhausted_raises(self) -> None:
        with respx.mock:
            respx.get(url__regex=rf"{BASE}/characters.*").mock(
                return_value=httpx.Response(503, json={"error": "unavailable"})
            )
            async with GenshinDbClient() as client:
                with pytest.raises(GenshinDbClientError):
                    await client.list_characters()

    async def test_retry_on_network_error_then_success(self) -> None:
        with respx.mock:
            route = respx.get(url__regex=rf"{BASE}/characters.*")
            route.side_effect = [
                httpx.ConnectError("connection refused"),
                httpx.Response(200, json=["Hu Tao"]),
            ]
            async with GenshinDbClient() as client:
                names = await client.list_characters()
        assert names == ["Hu Tao"]

    async def test_404_is_not_retried(self) -> None:
        with respx.mock:
            route = respx.get(url__regex=rf"{BASE}/characters.*")
            route.mock(return_value=httpx.Response(404))
            async with GenshinDbClient() as client:
                result = await client.get_character("Nope")
        assert result is None
        assert route.call_count == 1


class TestLifecycle:
    async def test_use_without_context_manager_raises(self) -> None:
        client = GenshinDbClient()
        with pytest.raises(RuntimeError, match="async context manager"):
            await client.list_characters()
