"""Mapping from genshin-db-api enum strings to our domain enums."""

from app.models.enums import Element, WeaponType

_ELEMENT_MAP: dict[str, Element] = {
    "ELEMENT_PYRO": Element.PYRO,
    "PYRO": Element.PYRO,
    "ELEMENT_HYDRO": Element.HYDRO,
    "HYDRO": Element.HYDRO,
    "ELEMENT_ANEMO": Element.ANEMO,
    "ANEMO": Element.ANEMO,
    "ELEMENT_ELECTRO": Element.ELECTRO,
    "ELECTRO": Element.ELECTRO,
    "ELEMENT_DENDRO": Element.DENDRO,
    "DENDRO": Element.DENDRO,
    "ELEMENT_CRYO": Element.CRYO,
    "CRYO": Element.CRYO,
    "ELEMENT_GEO": Element.GEO,
    "GEO": Element.GEO,
}

_WEAPON_MAP: dict[str, WeaponType] = {
    "WEAPON_SWORD_ONE_HAND": WeaponType.SWORD,
    "SWORD": WeaponType.SWORD,
    "WEAPON_CLAYMORE": WeaponType.CLAYMORE,
    "CLAYMORE": WeaponType.CLAYMORE,
    "WEAPON_POLEARM": WeaponType.POLEARM,
    "POLEARM": WeaponType.POLEARM,
    "WEAPON_POLE": WeaponType.POLEARM,
    "POLE": WeaponType.POLEARM,
    "WEAPON_BOW": WeaponType.BOW,
    "BOW": WeaponType.BOW,
    "WEAPON_CATALYST": WeaponType.CATALYST,
    "CATALYST": WeaponType.CATALYST,
}


def to_element(raw: str | None) -> Element:
    if not raw:
        raise ValueError("Element is empty")
    try:
        return _ELEMENT_MAP[raw.upper()]
    except KeyError as exc:
        raise ValueError(f"Unknown element: {raw}") from exc


def to_weapon_type(raw: str | None) -> WeaponType:
    if not raw:
        raise ValueError("Weapon type is empty")
    try:
        return _WEAPON_MAP[raw.upper()]
    except KeyError as exc:
        raise ValueError(f"Unknown weapon type: {raw}") from exc


def to_slug(name: str) -> str:
    """Convert a display name to a URL-friendly slug.

    Examples:
        "Hu Tao"          -> "hu-tao"
        "Staff of Homa"   -> "staff-of-homa"
        "Kamisato Ayaka"  -> "kamisato-ayaka"
    """
    return name.lower().replace("'", "").replace(" ", "-")


# Names that come from the API but are not real, playable catalog entries.
# They either lack a proper element/weapon type (Traveler variants, Aloy),
# or are placeholder records (Manekin/Manekina).
_SKIPPED_CHARACTER_NAMES: set[str] = {
    "Aether",
    "Lumine",
    "Manekin",
    "Manekina",
    "Aloy",
}


def should_skip_character(name: str) -> bool:
    """Return True for non-playable or placeholder character entries."""
    return name in _SKIPPED_CHARACTER_NAMES
