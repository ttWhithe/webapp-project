import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import Role


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)


class UserCreate(UserBase):
    """Payload for POST /auth/register."""

    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Payload for POST /auth/login."""

    email: EmailStr
    password: str


class UserRead(UserBase):
    """Public user representation, safe to return to client."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: Role
    avatar_url: str | None
    created_at: datetime
