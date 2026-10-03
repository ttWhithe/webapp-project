"""Read schemas for the public catalog: characters, weapons, artifact sets."""

import uuid

from pydantic import BaseModel, ConfigDict

from app.models.enums import Element, WeaponType


class Page[T](BaseModel):
    """Generic paginated response."""

    items: list[T]
    total: int
    limit: int
    offset: int


class CharacterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    external_id: int
    slug: str
    name: str
    name_ru: str | None
    title: str | None
    element: Element
    weapon_type: WeaponType
    rarity: int
    region: str | None
    birthday: str | None
    icon_url: str | None
    portrait_url: str | None
    version_added: str | None


class WeaponRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    external_id: int
    slug: str
    name: str
    name_ru: str | None
    weapon_type: WeaponType
    rarity: int
    base_atk: float | None
    main_stat: str | None
    icon_url: str | None
    version_added: str | None


class ArtifactSetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    external_id: int | None
    slug: str
    name: str
    name_ru: str | None
    icon_url: str | None
