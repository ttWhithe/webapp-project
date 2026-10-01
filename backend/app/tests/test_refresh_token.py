import uuid

import pytest
from redis.asyncio import Redis

from app.services.refresh_token import RefreshTokenService


@pytest.fixture
def service(redis_client: Redis) -> RefreshTokenService:
    return RefreshTokenService(redis_client)


class TestIssue:
    async def test_issue_returns_token_with_two_dots(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        token = await service.issue(user_id)
        parts = token.split(".")
        assert len(parts) == 3
        assert parts[0] == str(user_id)
        assert parts[1]  # jti not empty
        assert parts[2]  # secret not empty

    async def test_issue_produces_unique_tokens(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        t1 = await service.issue(user_id)
        t2 = await service.issue(user_id)
        assert t1 != t2


class TestVerify:
    async def test_verify_valid_token(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        token = await service.issue(user_id)
        assert await service.verify(user_id, token) is True

    async def test_verify_wrong_user(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        other_user = uuid.uuid4()
        token = await service.issue(user_id)
        assert await service.verify(other_user, token) is False

    async def test_verify_unknown_token(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        fake = f"{user_id}.somejti.somesecret"
        assert await service.verify(user_id, fake) is False

    async def test_verify_malformed_token(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        assert await service.verify(user_id, "no-dots") is False
        assert await service.verify(user_id, "only.two") is False
        assert await service.verify(user_id, f"{user_id}.jti.") is False
        assert await service.verify(user_id, ".jti.secret") is False
        assert await service.verify(user_id, "not-uuid.jti.secret") is False

    async def test_verify_tampered_secret(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        token = await service.issue(user_id)
        parts = token.split(".")
        tampered = f"{parts[0]}.{parts[1]}.completelydifferentsecret"
        assert await service.verify(user_id, tampered) is False

    async def test_verify_tampered_user_id(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        other_user = uuid.uuid4()
        token = await service.issue(user_id)
        parts = token.split(".")
        # Swap the user_id inside the token to a different one
        tampered = f"{other_user}.{parts[1]}.{parts[2]}"
        # verify with the original user_id must fail — token claims a different user
        assert await service.verify(user_id, tampered) is False


class TestRotate:
    async def test_rotate_returns_new_token(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        old = await service.issue(user_id)
        new = await service.rotate(user_id, old)
        assert new is not None
        assert new != old

    async def test_rotate_invalidates_old_token(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        old = await service.issue(user_id)
        new = await service.rotate(user_id, old)
        assert new is not None
        assert await service.verify(user_id, old) is False
        assert await service.verify(user_id, new) is True

    async def test_rotate_with_invalid_token_returns_none(
        self, service: RefreshTokenService
    ) -> None:
        user_id = uuid.uuid4()
        fake = f"{user_id}.jti.secret"
        assert await service.rotate(user_id, fake) is None


class TestRevoke:
    async def test_revoke_single_token(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        token = await service.issue(user_id)
        await service.revoke(user_id, token)
        assert await service.verify(user_id, token) is False

    async def test_revoke_malformed_token_is_noop(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        await service.revoke(user_id, "no-dots")

    async def test_revoke_all_removes_every_token(self, service: RefreshTokenService) -> None:
        user_id = uuid.uuid4()
        t1 = await service.issue(user_id)
        t2 = await service.issue(user_id)
        t3 = await service.issue(user_id)

        deleted = await service.revoke_all(user_id)
        assert deleted == 3
        assert await service.verify(user_id, t1) is False
        assert await service.verify(user_id, t2) is False
        assert await service.verify(user_id, t3) is False

    async def test_revoke_all_does_not_touch_other_users(
        self, service: RefreshTokenService
    ) -> None:
        user_a = uuid.uuid4()
        user_b = uuid.uuid4()
        token_a = await service.issue(user_a)
        token_b = await service.issue(user_b)

        await service.revoke_all(user_a)
        assert await service.verify(user_a, token_a) is False
        assert await service.verify(user_b, token_b) is True
