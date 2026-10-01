from datetime import timedelta

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_password_returns_argon2_hash(self) -> None:
        hashed = hash_password("my-secret-password")
        assert hashed.startswith("$argon2")

    def test_hash_is_different_each_time(self) -> None:
        h1 = hash_password("same-password")
        h2 = hash_password("same-password")
        assert h1 != h2  # salt is random

    def test_verify_password_correct(self) -> None:
        hashed = hash_password("correct-horse-battery-staple")
        assert verify_password("correct-horse-battery-staple", hashed) is True

    def test_verify_password_incorrect(self) -> None:
        hashed = hash_password("correct-horse-battery-staple")
        assert verify_password("wrong-password", hashed) is False

    def test_verify_password_invalid_hash(self) -> None:
        assert verify_password("anything", "not-a-valid-hash") is False


class TestAccessToken:
    def test_create_and_decode(self) -> None:
        token = create_access_token(subject="user-123", role="USER")
        payload = decode_access_token(token)
        assert payload["sub"] == "user-123"
        assert payload["role"] == "USER"
        assert payload["type"] == "access"
        assert "iat" in payload
        assert "exp" in payload

    def test_decode_invalid_token_raises(self) -> None:
        with pytest.raises(JWTError):
            decode_access_token("not-a-token")

    def test_expired_token_raises(self) -> None:
        token = create_access_token(
            subject="user-456",
            role="ADMIN",
            expires_delta=timedelta(seconds=-1),
        )
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_custom_role_preserved(self) -> None:
        token = create_access_token(subject="user-789", role="ADMIN")
        payload = decode_access_token(token)
        assert payload["role"] == "ADMIN"
        assert payload["sub"] == "user-789"
