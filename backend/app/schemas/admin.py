"""Schemas for admin endpoints."""

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Element, WeaponType


class SyncStatsSchema(BaseModel):
    """Result of POST /admin/catalog/sync."""

    model_config = ConfigDict(from_attributes=True)

    added: int = Field(ge=0)
    updated: int = Field(ge=0)
    failed: int = Field(ge=0)
    errors: list[str] = Field(default_factory=list)


class AdminCharacterUpdate(BaseModel):
    """Editable fields on a Character. All optional; only set fields are applied.

    Note: `slug` and `name` are intentionally NOT editable — they come from the
    external API and are used as stable identifiers.
    """

    name_ru: str | None = Field(None, max_length=120)
    title: str | None = Field(None, max_length=200)
    rarity: int | None = Field(None, ge=1, le=5)
    region: str | None = Field(None, max_length=80)
    birthday: str | None = Field(None, max_length=20)
    icon_url: str | None = Field(None, max_length=500)
    portrait_url: str | None = Field(None, max_length=500)
    version_added: str | None = Field(None, max_length=10)
    element: Element | None = None
    weapon_type: WeaponType | None = None


class AdminWeaponUpdate(BaseModel):
    name_ru: str | None = Field(None, max_length=150)
    rarity: int | None = Field(None, ge=1, le=5)
    icon_url: str | None = Field(None, max_length=500)
    icon_awakened_url: str | None = Field(None, max_length=500)
    base_atk: float | None = Field(None, ge=0)
    main_stat: str | None = Field(None, max_length=80)
    version_added: str | None = Field(None, max_length=10)


class AdminArtifactSetUpdate(BaseModel):
    name_ru: str | None = Field(None, max_length=150)
    icon_url: str | None = Field(None, max_length=500)
    icon_plume_url: str | None = Field(None, max_length=500)
    icon_sands_url: str | None = Field(None, max_length=500)
    icon_goblet_url: str | None = Field(None, max_length=500)
    icon_circlet_url: str | None = Field(None, max_length=500)


class AdminCharacterRead(BaseModel):
    """Extended character view for the admin panel."""

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


class AdminWeaponRead(BaseModel):
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
    icon_awakened_url: str | None
    version_added: str | None


class AdminArtifactSetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    external_id: int | None
    slug: str
    name: str
    name_ru: str | None
    icon_url: str | None
    icon_plume_url: str | None
    icon_sands_url: str | None
    icon_goblet_url: str | None
    icon_circlet_url: str | None
