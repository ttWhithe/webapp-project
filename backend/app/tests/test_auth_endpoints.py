"""Integration tests for auth endpoints.

Uses a real httpx AsyncClient against the FastAPI app, with real Postgres
and real Redis via fixture overrides. Cookies are stored in the client's
cookie jar, so we test the full browser-like flow.
"""

import httpx


def _register_payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "email": "user@example.com",
        "username": "user",
        "password": "password123",
    }
    base.update(overrides)
    return base


class TestRegister:
    async def test_register_success(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.post("/api/v1/auth/register", json=_register_payload())
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["email"] == "user@example.com"
        assert data["username"] == "user"
        assert data["role"] == "user"
        assert "id" in data
        assert "hashed_password" not in data
        assert "access_token" in async_client.cookies
        assert "refresh_token" in async_client.cookies

    async def test_register_duplicate_email(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        resp = await async_client.post(
            "/api/v1/auth/register",
            json=_register_payload(username="different"),
        )
        assert resp.status_code == 409
        assert "email" in resp.json()["detail"].lower()

    async def test_register_duplicate_username(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        resp = await async_client.post(
            "/api/v1/auth/register",
            json=_register_payload(email="different@example.com"),
        )
        assert resp.status_code == 409
        assert "username" in resp.json()["detail"].lower()

    async def test_register_invalid_email(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.post(
            "/api/v1/auth/register",
            json=_register_payload(email="not-an-email"),
        )
        assert resp.status_code == 422

    async def test_register_short_password(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.post(
            "/api/v1/auth/register",
            json=_register_payload(password="short"),
        )
        assert resp.status_code == 422

    async def test_register_short_username(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.post(
            "/api/v1/auth/register",
            json=_register_payload(username="ab"),
        )
        assert resp.status_code == 422


class TestLogin:
    async def _register(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        async_client.cookies.clear()

    async def test_login_success(self, async_client: httpx.AsyncClient) -> None:
        await self._register(async_client)
        resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "password123"},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["email"] == "user@example.com"
        assert "access_token" in async_client.cookies

    async def test_login_wrong_password(self, async_client: httpx.AsyncClient) -> None:
        await self._register(async_client)
        resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "wrong-password"},
        )
        assert resp.status_code == 401

    async def test_login_unknown_email(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "password123"},
        )
        assert resp.status_code == 401


class TestRefresh:
    async def test_refresh_success(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        old_refresh = async_client.cookies["refresh_token"]
        resp = await async_client.post("/api/v1/auth/refresh")
        assert resp.status_code == 200, resp.text
        assert resp.json()["email"] == "user@example.com"
        assert async_client.cookies["refresh_token"] != old_refresh

    async def test_refresh_without_cookie(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    async def test_refresh_with_invalid_cookie(self, async_client: httpx.AsyncClient) -> None:
        async_client.cookies.set(
            "refresh_token",
            "not-a-valid-token",
            path="/api/v1/auth",
        )
        resp = await async_client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    async def test_refresh_rotates_old_token(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        old_refresh = async_client.cookies["refresh_token"]
        # first refresh — succeeds
        resp1 = await async_client.post("/api/v1/auth/refresh")
        assert resp1.status_code == 200
        # put the OLD refresh token back into the cookie jar
        async_client.cookies.set("refresh_token", old_refresh, path="/api/v1/auth")
        # second refresh with the old token — must fail (rotated out)
        resp2 = await async_client.post("/api/v1/auth/refresh")
        assert resp2.status_code == 401


class TestLogout:
    async def test_logout_clears_cookies(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        assert "access_token" in async_client.cookies
        resp = await async_client.post("/api/v1/auth/logout")
        assert resp.status_code == 204
        assert "access_token" not in async_client.cookies
        assert "refresh_token" not in async_client.cookies

    async def test_me_after_logout(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        await async_client.post("/api/v1/auth/logout")
        resp = await async_client.get("/api/v1/users/me")
        assert resp.status_code == 401


class TestCurrentUser:
    async def test_me_success(self, async_client: httpx.AsyncClient) -> None:
        await async_client.post("/api/v1/auth/register", json=_register_payload())
        resp = await async_client.get("/api/v1/users/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == "user@example.com"

    async def test_me_without_auth(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.get("/api/v1/users/me")
        assert resp.status_code == 401
