"""Password hashing and JWT utilities."""

from datetime import UTC, datetime, timedelta
from typing import Any, cast

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from jose import jwt

from app.core.config import settings

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a plaintext password with Argon2id."""
    return _ph.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against an Argon2 hash.

    Returns False on any failure (mismatch or malformed hash) instead of raising,
    so callers can treat it as a simple boolean check.
    """
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_access_token(
    subject: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        subject: user id (usually UUID as string).
        role: user role (e.g. "USER", "ADMIN").
        expires_delta: custom TTL. If None, uses settings.access_token_expire_minutes.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)

    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    encoded = jwt.encode(payload, settings.app_secret_key, algorithm=settings.jwt_algorithm)
    return cast(str, encoded)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Raises jose.JWTError on any validation failure (bad signature, expired, malformed).
    """
    decoded = jwt.decode(
        token,
        settings.app_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
    return cast(dict[str, Any], decoded)
