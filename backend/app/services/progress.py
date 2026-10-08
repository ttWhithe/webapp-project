"""Character progression formula.

Each component returns a value in [0, 100] (percent of that component's max).
The final `total` is the weighted sum, also in [0, 100].

Weights (MVP): equal — 20% per component. Change WEIGHTS to rebalance.
The formula itself is pure — no DB, no I/O — so it's trivially unit-testable.
"""

from dataclasses import dataclass

# --- Configuration ----------------------------------------------------------

WEIGHTS: dict[str, float] = {
    "level": 0.20,
    "talents": 0.20,
    "weapon": 0.20,
    "artifacts": 0.20,
    "friendship": 0.20,
}

# Talents cap for progress purposes: level 9 is the "max" without a Crown.
# Values 10-13 are recorded (and shown with a Crown badge) but do NOT push
# progress beyond 100% for that component.
TALENT_PROGRESS_CAP = 9
TALENT_HARD_MAX = 13
CROWN_THRESHOLD = 10

FRIENDSHIP_MAX = 10

WEAPON_MAX_LEVEL = 90
WEAPON_MAX_REFINEMENT = 5
# Weapon splits into level (70%) + refinement (30%)
WEAPON_LEVEL_SHARE = 0.7
WEAPON_REFINEMENT_SHARE = 0.3

# Artifact max level depends on rarity.
ARTIFACT_MAX_LEVEL_BY_RARITY: dict[int, int] = {
    1: 4,
    2: 4,
    3: 12,
    4: 16,
    5: 20,
}
ARTIFACT_SLOT_COUNT = 5


# --- Result ----------------------------------------------------------------


@dataclass(frozen=True)
class ProgressBreakdown:
    """Weighted components (0-100 each) and their sum."""

    level: float
    talents: float
    weapon: float
    artifacts: float
    friendship: float

    @property
    def total(self) -> float:
        """Total progression in [0, 100], rounded to 2 decimals."""
        return round(
            self.level + self.talents + self.weapon + self.artifacts + self.friendship,
            2,
        )

    def to_dict(self) -> dict[str, float]:
        return {
            "total": self.total,
            "level": round(self.level, 2),
            "talents": round(self.talents, 2),
            "weapon": round(self.weapon, 2),
            "artifacts": round(self.artifacts, 2),
            "friendship": round(self.friendship, 2),
        }


# --- Helpers ---------------------------------------------------------------


def _clamp01(value: float) -> float:
    """Clamp to [0, 1]. Used before multiplying by weights * 100."""
    return max(0.0, min(1.0, value))


PROGRESS_LEVEL_CAP = 90
"""Fixed 90-level target for the progress formula.

Levels 91-100 require Masterless Stella Fortuna (rare), so they don't push
the progress percentage above 100% and are tracked separately in the UI.
"""


def _level_fraction(level: int, level_cap: int) -> float:
    """Progress toward the standard 90-level cap.

    `level_cap` above 90 is clamped to 90 — extra levels are bonus achievements,
    not part of the base progression target.
    """
    if level_cap <= 0:
        return 0.0
    effective_cap = min(level_cap, PROGRESS_LEVEL_CAP)
    return _clamp01(level / effective_cap)


def _talent_fraction(talent: int) -> float:
    """0-9 counts linearly, 10+ is treated as fully maxed (no over-credit)."""
    capped = min(talent, TALENT_PROGRESS_CAP)
    return _clamp01(capped / TALENT_PROGRESS_CAP)


def _talents_fraction(normal: int, skill: int, burst: int) -> float:
    return (_talent_fraction(normal) + _talent_fraction(skill) + _talent_fraction(burst)) / 3


def _weapon_fraction(level: int | None, refinement: int | None) -> float:
    if level is None or refinement is None:
        return 0.0
    level_part = _clamp01(level / WEAPON_MAX_LEVEL) * WEAPON_LEVEL_SHARE
    ref_part = _clamp01(refinement / WEAPON_MAX_REFINEMENT) * WEAPON_REFINEMENT_SHARE
    return level_part + ref_part


def _artifact_fraction(level: int, rarity: int) -> float:
    max_level = ARTIFACT_MAX_LEVEL_BY_RARITY.get(rarity)
    if not max_level:
        return 0.0
    return _clamp01(level / max_level)


def _artifacts_fraction(artifacts: list[tuple[int, int]]) -> float:
    """`artifacts` is a list of (level, rarity) tuples. Missing slots count as 0."""
    scores = [_artifact_fraction(lvl, rar) for lvl, rar in artifacts[:ARTIFACT_SLOT_COUNT]]
    # Pad to 5 slots so that having fewer than 5 artifacts is penalized.
    scores.extend([0.0] * (ARTIFACT_SLOT_COUNT - len(scores)))
    return sum(scores) / ARTIFACT_SLOT_COUNT


def _friendship_fraction(friendship: int) -> float:
    return _clamp01(friendship / FRIENDSHIP_MAX)


# --- Public API ------------------------------------------------------------


def count_crowns(talent_normal: int, talent_skill: int, talent_burst: int) -> int:
    """Number of talents raised to 10+ (i.e. crowned). Display-only, not in %."""
    return sum(1 for t in (talent_normal, talent_skill, talent_burst) if t >= CROWN_THRESHOLD)


def calculate_progress(
    *,
    level: int,
    level_cap: int,
    friendship: int,
    talent_normal: int,
    talent_skill: int,
    talent_burst: int,
    weapon_level: int | None,
    weapon_refinement: int | None,
    artifacts: list[tuple[int, int]],
) -> ProgressBreakdown:
    """Compute the progress breakdown.

    Args:
        level: character level (1-100).
        level_cap: user's chosen cap (90 / 95 / 100).
        friendship: 1-10.
        talent_normal / skill / burst: 1-13.
        weapon_level: 1-90 (None if not set).
        weapon_refinement: 1-5 (None if not set).
        artifacts: list of (level, rarity) for equipped artifacts, 0-5 items.

    Returns:
        ProgressBreakdown with weighted components in [0, 100].
    """
    return ProgressBreakdown(
        level=WEIGHTS["level"] * 100 * _level_fraction(level, level_cap),
        talents=WEIGHTS["talents"]
        * 100
        * _talents_fraction(talent_normal, talent_skill, talent_burst),
        weapon=WEIGHTS["weapon"] * 100 * _weapon_fraction(weapon_level, weapon_refinement),
        artifacts=WEIGHTS["artifacts"] * 100 * _artifacts_fraction(artifacts),
        friendship=WEIGHTS["friendship"] * 100 * _friendship_fraction(friendship),
    )
