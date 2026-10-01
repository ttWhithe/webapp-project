from enum import StrEnum


class Role(StrEnum):
    """User role for RBAC."""

    GUEST = "guest"
    USER = "user"
    PREMIUM = "premium"
    ADMIN = "admin"
