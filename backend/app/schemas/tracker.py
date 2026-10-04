"""Schemas for the tracker: user's characters and their artifacts."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ArtifactSlot, Element, WeaponType

# --- Embedded catalog briefs ------------------------------------------------


class CharacterBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    name_ru: str | None
    element: Element
    weapon_type: WeaponType
    rarity: int
    icon_url: str | None
    portrait_url: str | None


class WeaponBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    weapon_type: WeaponType
    rarity: int
    icon_url: str | None


# --- Artifacts --------------------------------------------------------------


class UserArtifactIn(BaseModel):
    """Artifact payload for create/update."""

    slot: ArtifactSlot
    set_id: uuid.UUID
    rarity: int = Field(ge=1, le=5)
    level: int = Field(ge=0, le=20)
    main_stat: str | None = None
    substats: list[dict[str, object]] | None = None


class UserArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slot: ArtifactSlot
    set_id: uuid.UUID
    set_slug: str
    set_name: str
    rarity: int
    level: int
    main_stat: str | None
    substats: list[dict[str, object]] | None


# --- Progress ---------------------------------------------------------------


class ProgressBreakdownSchema(BaseModel):
    total: float
    level: float
    talents: float
    weapon: float
    artifacts: float
    friendship: float


# --- UserCharacter: create / update / read ----------------------------------


class UserCharacterCreate(BaseModel):
    """Payload for POST /me/characters. Only character_id is required."""

    character_id: uuid.UUID

    level: int = Field(1, ge=1, le=100)
    level_cap: Literal[90, 95, 100] = 90
    friendship: int = Field(1, ge=1, le=10)
    talent_normal: int = Field(1, ge=1, le=13)
    talent_skill: int = Field(1, ge=1, le=13)
    talent_burst: int = Field(1, ge=1, le=13)
    constellation: int = Field(0, ge=0, le=6)
    masterless_stella_fortuna: int = Field(0, ge=0, le=3)

    weapon_id: uuid.UUID | None = None
    weapon_level: int | None = Field(None, ge=1, le=90)
    weapon_refinement: int | None = Field(None, ge=1, le=5)

    custom_icon_url: str | None = None
    custom_portrait_url: str | None = None
    custom_background_url: str | None = None

    custom_hp: int | None = Field(None, ge=0)
    custom_atk: int | None = Field(None, ge=0)
    custom_def: int | None = Field(None, ge=0)
    custom_em: int | None = Field(None, ge=0)
    custom_crit_rate: float | None = Field(None, ge=0, le=200)
    custom_crit_dmg: float | None = Field(None, ge=0, le=500)
    custom_energy_recharge: float | None = Field(None, ge=0, le=500)
    custom_elemental_dmg_bonus: float | None = Field(None, ge=0, le=500)

    artifacts: list[UserArtifactIn] | None = None


class UserCharacterUpdate(BaseModel):
    """Payload for PATCH /me/characters/{id}. All fields optional."""

    level: int | None = Field(None, ge=1, le=100)
    level_cap: Literal[90, 95, 100] | None = None
    friendship: int | None = Field(None, ge=1, le=10)
    talent_normal: int | None = Field(None, ge=1, le=13)
    talent_skill: int | None = Field(None, ge=1, le=13)
    talent_burst: int | None = Field(None, ge=1, le=13)
    constellation: int | None = Field(None, ge=0, le=6)
    masterless_stella_fortuna: int | None = Field(None, ge=0, le=3)

    weapon_id: uuid.UUID | None = None
    weapon_level: int | None = Field(None, ge=1, le=90)
    weapon_refinement: int | None = Field(None, ge=1, le=5)

    custom_icon_url: str | None = None
    custom_portrait_url: str | None = None
    custom_background_url: str | None = None

    custom_hp: int | None = Field(None, ge=0)
    custom_atk: int | None = Field(None, ge=0)
    custom_def: int | None = Field(None, ge=0)
    custom_em: int | None = Field(None, ge=0)
    custom_crit_rate: float | None = Field(None, ge=0, le=200)
    custom_crit_dmg: float | None = Field(None, ge=0, le=500)
    custom_energy_recharge: float | None = Field(None, ge=0, le=500)
    custom_elemental_dmg_bonus: float | None = Field(None, ge=0, le=500)

    # If provided (even empty list), replaces the whole artifact set.
    artifacts: list[UserArtifactIn] | None = None


class UserCharacterListItem(BaseModel):
    """Compact list item for GET /me/characters."""

    id: uuid.UUID
    character: CharacterBrief
    level: int
    level_cap: int
    constellation: int
    friendship: int
    crowns_used: int
    progress: float


class UserCharacterDetail(BaseModel):
    """Full detail for GET /me/characters/{id}."""

    id: uuid.UUID
    character: CharacterBrief
    level: int
    level_cap: int
    friendship: int
    constellation: int
    crowns_used: int
    masterless_stella_fortuna: int

    talent_normal: int
    talent_skill: int
    talent_burst: int

    weapon: WeaponBrief | None
    weapon_level: int | None
    weapon_refinement: int | None

    artifacts: list[UserArtifactRead]

    custom_icon_url: str | None
    custom_portrait_url: str | None
    custom_background_url: str | None

    custom_hp: int | None
    custom_atk: int | None
    custom_def: int | None
    custom_em: int | None
    custom_crit_rate: float | None
    custom_crit_dmg: float | None
    custom_energy_recharge: float | None
    custom_elemental_dmg_bonus: float | None

    progress: ProgressBreakdownSchema

    created_at: datetime
    updated_at: datetime
