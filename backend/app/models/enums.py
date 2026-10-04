from enum import StrEnum


class Role(StrEnum):
    """User role for RBAC."""

    GUEST = "guest"
    USER = "user"
    PREMIUM = "premium"
    ADMIN = "admin"


class Element(StrEnum):
    """Character elemental type."""

    PYRO = "pyro"
    HYDRO = "hydro"
    ANEMO = "anemo"
    ELECTRO = "electro"
    DENDRO = "dendro"
    CRYO = "cryo"
    GEO = "geo"


class WeaponType(StrEnum):
    """Weapon category."""

    SWORD = "sword"
    CLAYMORE = "claymore"
    POLEARM = "polearm"
    BOW = "bow"
    CATALYST = "catalyst"


class ArtifactSlot(StrEnum):
    """Artifact equipment slot."""

    FLOWER = "flower"
    PLUME = "plume"
    SANDS = "sands"
    GOBLET = "goblet"
    CIRCLET = "circlet"
