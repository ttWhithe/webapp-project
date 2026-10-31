"""Unit tests for the progress formula.

All tests use primitive inputs — no DB, no models. If any test needs the DB,
that's a sign the function has an unwanted dependency.
"""

import pytest

from app.services.progress import (
    ProgressBreakdown,
    _friendship_fraction,
    _level_fraction,
    calculate_progress,
    count_crowns,
)


def _calc(**overrides: object) -> ProgressBreakdown:
    """Default: maxed-out character. Override any field per test."""
    base: dict[str, object] = {
        "level": 90,
        "level_cap": 90,
        "friendship": 10,
        "talent_normal": 9,
        "talent_skill": 9,
        "talent_burst": 9,
        "weapon_level": 90,
        "weapon_refinement": 5,
        "artifacts": [(20, 5)] * 5,
    }
    base.update(overrides)
    return calculate_progress(**base)  # type: ignore[arg-type]


class TestPerfectCharacter:
    def test_maxed_character_is_100(self) -> None:
        result = _calc()
        assert result.total == 100.0

    def test_all_components_full(self) -> None:
        result = _calc()
        assert result.level == 20.0
        assert result.talents == 20.0
        assert result.weapon == 20.0
        assert result.artifacts == 20.0
        assert result.friendship == 20.0


class TestLevel:
    def test_level_one_gives_zero(self) -> None:
        # Level 1 = 0% by design (min state = 0%)
        result = _calc(level=1, level_cap=90)
        assert result.level == 0.0

    def test_half_level(self) -> None:
        # (45 - 1) / (90 - 1) = 44/89 ≈ 0.4944 → * 20 ≈ 9.89
        result = _calc(level=45, level_cap=90)
        assert result.level == pytest.approx(9.89, abs=0.02)

    def test_level_at_cap_100(self) -> None:
        # level 100, cap 100 → full
        result = _calc(level=100, level_cap=100)
        assert result.level == 20.0

    def test_level_90_with_cap_100_counts_as_maxed(self) -> None:
        # 90/90 = 100% — cap above 90 doesn't reduce progress
        result = _calc(level=90, level_cap=100)
        assert result.level == 20.0

    def test_level_95_with_cap_100_is_clamped(self) -> None:
        # 95/90 → clamped to 100%
        result = _calc(level=95, level_cap=100)
        assert result.level == 20.0

    def test_level_above_cap_is_clamped(self) -> None:
        # level 100 with cap 90 → still full (no over-credit)
        result = _calc(level=100, level_cap=90)
        assert result.level == 20.0

    def test_zero_cap_does_not_crash(self) -> None:
        result = _calc(level=50, level_cap=0)
        assert result.level == 0.0


class TestTalents:
    def test_all_nines_gives_full_component(self) -> None:
        result = _calc(talent_normal=9, talent_skill=9, talent_burst=9)
        assert result.talents == 20.0

    def test_crowned_talents_do_not_over_credit(self) -> None:
        # 13/13/13 should still be 100% of the talents component
        result = _calc(talent_normal=13, talent_skill=13, talent_burst=13)
        assert result.talents == 20.0

    def test_one_one_one_is_zero(self) -> None:
        # Talent 1 = 0% by design
        result = _calc(talent_normal=1, talent_skill=1, talent_burst=1)
        assert result.talents == 0.0

    def test_mixed_talents(self) -> None:
        # 9/9/1 → (1 + 1 + 0) / 3 = 0.6667; * 20 ≈ 13.33
        result = _calc(talent_normal=9, talent_skill=9, talent_burst=1)
        assert result.talents == pytest.approx(13.33, abs=0.02)

    def test_ten_counts_as_nine(self) -> None:
        """A crowned talent (10) is worth the same as 9 for progress."""
        result_9 = _calc(talent_normal=9, talent_skill=9, talent_burst=9)
        result_10 = _calc(talent_normal=10, talent_skill=9, talent_burst=9)
        assert result_9.talents == result_10.talents


class TestWeapon:
    def test_no_weapon_gives_zero(self) -> None:
        result = _calc(weapon_level=None, weapon_refinement=None)
        assert result.weapon == 0.0

    def test_only_level_no_refinement_still_counts(self) -> None:
        # Refinement doesn't affect progress, only level matters
        result = _calc(weapon_level=90, weapon_refinement=None)
        assert result.weapon == 20.0

    def test_max_weapon_is_full(self) -> None:
        result = _calc(weapon_level=90, weapon_refinement=5)
        assert result.weapon == 20.0

    def test_half_level(self) -> None:
        # 45/90 = 0.5 → * 20 = 10.0
        result = _calc(weapon_level=45, weapon_refinement=5)
        assert result.weapon == pytest.approx(10.0, abs=0.01)

    def test_refinement_does_not_affect_progress(self) -> None:
        r1 = _calc(weapon_level=45, weapon_refinement=1)
        r5 = _calc(weapon_level=45, weapon_refinement=5)
        assert r1.weapon == r5.weapon


class TestArtifacts:
    def test_no_artifacts_gives_zero(self) -> None:
        result = _calc(artifacts=[])
        assert result.artifacts == 0.0

    def test_one_artifact_only_fifth(self) -> None:
        # 1 maxed out of 5 slots → 1/5 of component = 4.0
        result = _calc(artifacts=[(20, 5)])
        assert result.artifacts == pytest.approx(4.0, abs=0.01)

    def test_all_five_star_maxed(self) -> None:
        result = _calc(artifacts=[(20, 5)] * 5)
        assert result.artifacts == 20.0

    def test_four_star_at_16_counts_as_maxed(self) -> None:
        result = _calc(artifacts=[(16, 4)] * 5)
        assert result.artifacts == 20.0

    def test_three_star_at_12_counts_as_maxed(self) -> None:
        result = _calc(artifacts=[(12, 3)] * 5)
        assert result.artifacts == 20.0

    def test_low_star_with_high_level_clamped(self) -> None:
        # 3-star level 20 is impossible, but if data slips through: clamp at 1.0
        result = _calc(artifacts=[(20, 3)] * 5)
        assert result.artifacts == 20.0

    def test_unknown_rarity_counts_as_zero(self) -> None:
        result = _calc(artifacts=[(20, 99)] * 5)
        assert result.artifacts == 0.0

    def test_mixed_artifacts(self) -> None:
        # [(20,5), (16,4), (12,3), (4,1), (4,2)] → all maxed → 20.0
        result = _calc(artifacts=[(20, 5), (16, 4), (12, 3), (4, 1), (4, 2)])
        assert result.artifacts == pytest.approx(20.0, abs=0.01)


class TestFriendship:
    def test_friendship_ten_full(self) -> None:
        result = _calc(friendship=10)
        assert result.friendship == 20.0

    def test_friendship_five_half(self) -> None:
        # (5 - 1) / (10 - 1) = 4/9 ≈ 0.4444 → * 20 ≈ 8.89
        result = _calc(friendship=5)
        assert result.friendship == pytest.approx(8.89, abs=0.02)

    def test_friendship_one_is_zero(self) -> None:
        # Friendship 1 = 0% by design
        result = _calc(friendship=1)
        assert result.friendship == 0.0


class TestTotal:
    def test_total_is_sum_of_components(self) -> None:
        result = _calc(level=45, talent_normal=5, weapon_level=45, friendship=5)
        expected = (
            result.level + result.talents + result.weapon + result.artifacts + result.friendship
        )
        assert result.total == pytest.approx(round(expected, 2), abs=0.01)

    def test_fresh_character(self) -> None:
        # Level 1, no weapon, no artifacts, friendship 1, talents 1/1/1
        result = _calc(
            level=1,
            level_cap=90,
            friendship=1,
            talent_normal=1,
            talent_skill=1,
            talent_burst=1,
            weapon_level=None,
            weapon_refinement=None,
            artifacts=[],
        )
        # All components at minimum → 0%
        assert result.total == 0.0

    def test_to_dict_shape(self) -> None:
        result = _calc()
        d = result.to_dict()
        assert set(d.keys()) == {"total", "level", "talents", "weapon", "artifacts", "friendship"}
        assert d["total"] == 100.0

    def test_all_components_in_range(self) -> None:
        for level in (1, 45, 90, 100):
            for cap in (90, 95, 100):
                r = _calc(level=level, level_cap=cap)
                for comp in (r.level, r.talents, r.weapon, r.artifacts, r.friendship):
                    assert 0.0 <= comp <= 100.0
                assert 0.0 <= r.total <= 100.0


class TestCountCrowns:
    def test_no_crowns(self) -> None:
        assert count_crowns(9, 9, 9) == 0

    def test_one_crown(self) -> None:
        assert count_crowns(10, 9, 9) == 1

    def test_two_crowns(self) -> None:
        assert count_crowns(13, 10, 9) == 2

    def test_three_crowns(self) -> None:
        assert count_crowns(10, 10, 10) == 3


class TestProgressEdgeCases:
    def test_zero_caps(self) -> None:
        # Проверяем ветки, где cap <= 1 (строки 99, 107, 140)
        assert _level_fraction(level=10, level_cap=1) == 0.0
        assert _level_fraction(level=10, level_cap=0) == 0.0
        assert _friendship_fraction(friendship=5) >= 0.0  # Тут cap = 10, но проверим логику
