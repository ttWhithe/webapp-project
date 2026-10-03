"""Mapping from genshin-db-api enum strings to our domain enums."""

from app.models.enums import Element, WeaponType

_ELEMENT_MAP: dict[str, Element] = {
    "ELEMENT_PYRO": Element.PYRO,
    "ELEMENT_HYDRO": Element.HYDRO,
    "ELEMENT_ANEMO": Element.ANEMO,
    "ELEMENT_ELECTRO": Element.ELECTRO,
    "ELEMENT_DENDRO": Element.DENDRO,
    "ELEMENT_CRYO": Element.CRYO,
    "ELEMENT_GEO": Element.GEO,
}

_WEAPON_MAP: dict[str, WeaponType] = {
    "WEAPON_SWORD_ONE_HAND": WeaponType.SWORD,
    "WEAPON_CLAYMORE": WeaponType.CLAYMORE,
    "WEAPON_POLEARM": WeaponType.POLEARM,
    "WEAPON_POLE": WeaponType.POLEARM,
    "WEAPON_BOW": WeaponType.BOW,
    "WEAPON_CATALYST": WeaponType.CATALYST,
}


def to_element(raw: str) -> Element:
    try:
        return _ELEMENT_MAP[raw]
    except KeyError as exc:
        raise ValueError(f"Unknown element: {raw}") from exc


def to_weapon_type(raw: str) -> WeaponType:
    try:
        return _WEAPON_MAP[raw]
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
