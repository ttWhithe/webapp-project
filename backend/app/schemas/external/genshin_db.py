"""Pydantic schemas for responses from genshin-db-api.

We only model the fields we actually use. The API returns many more — we ignore
them (Pydantic's default behavior: extra fields are silently dropped).

API source: https://genshin-db-api.vercel.app/api/v5
"""

from pydantic import BaseModel, ConfigDict, Field


class _BaseExternalModel(BaseModel):
    """Base for external API models.

    populate_by_name=True so we can construct via snake_case aliases in tests,
    while still parsing the camelCase JSON from the API.
    """

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class CharacterImages(_BaseExternalModel):
    card: str | None = None
    portrait: str | None = None
    icon: str | None = None


class ExternalCharacter(_BaseExternalModel):
    """Character response from /api/v5/characters?query=<name>."""

    id: int
    name: str
    title: str | None = None
    element_type: str = Field(alias="elementType")
    element_text: str = Field(alias="elementText")
    weapon_type: str = Field(alias="weaponType")
    weapon_text: str = Field(alias="weaponText")
    rarity: int
    region: str | None = None
    birthday_mmdd: str | None = Field(default=None, alias="birthdaymmdd")
    images: CharacterImages = Field(default_factory=CharacterImages)
    version: str | None = None


class WeaponImages(_BaseExternalModel):
    icon: str | None = None
    awakened: str | None = None


class ExternalWeapon(_BaseExternalModel):
    """Weapon response from /api/v5/weapons?query=<name>."""

    id: int
    name: str
    weapon_type: str = Field(alias="weaponType")
    weapon_text: str = Field(alias="weaponText")
    rarity: int
    base_atk_value: float | None = Field(default=None, alias="baseAtkValue")
    main_stat_text: str | None = Field(default=None, alias="mainStatText")
    images: WeaponImages = Field(default_factory=WeaponImages)
    version: str | None = None


class ArtifactImages(_BaseExternalModel):
    flower: str | None = None
    plume: str | None = None
    sands: str | None = None
    goblet: str | None = None
    circlet: str | None = None


class ExternalArtifactSet(_BaseExternalModel):
    """Artifact set response from /api/v5/artifacts?query=<name>."""

    id: int | None = None
    name: str
    rarity_list: list[int] | None = Field(default=None, alias="rarityList")
    images: ArtifactImages = Field(default_factory=ArtifactImages)
    version: str | None = None
