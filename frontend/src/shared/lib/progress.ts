/**
 * Client-side mirror of the backend progress formula.
 * Used for live-updating the UI while sliders move — before the PATCH lands.
 *
 * MUST stay in sync with backend/app/services/progress.py
 */

export interface ProgressInputs {
  level: number
  levelCap: number
  friendship: number
  talentNormal: number
  talentSkill: number
  talentBurst: number
  weaponLevel: number | null
  weaponRefinement: number | null
  /** Array of (level, rarity) for equipped artifacts. Length 0..5 */
  artifacts: Array<[level: number, rarity: number]>
}

export interface ProgressBreakdown {
  total: number
  level: number
  talents: number
  weapon: number
  artifacts: number
  friendship: number
}

export const PROGRESS_LEVEL_CAP = 90

const WEIGHTS = {
  level: 0.2,
  talents: 0.2,
  weapon: 0.2,
  artifacts: 0.2,
  friendship: 0.2,
}

const TALENT_PROGRESS_CAP = 9
const FRIENDSHIP_MAX = 10
const WEAPON_MAX_LEVEL = 90
const WEAPON_MAX_REFINEMENT = 5

const ARTIFACT_MAX_LEVEL: Record<number, number> = {
  1: 4,
  2: 4,
  3: 12,
  4: 16,
  5: 20,
}

const ARTIFACT_SLOT_COUNT = 5

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function levelFraction(level: number, cap: number): number {
  if (cap <= 0) return 0
  const effectiveCap = Math.min(cap, PROGRESS_LEVEL_CAP)
  if (effectiveCap <= 1) return 0
  return clamp01((level - 1) / (effectiveCap - 1))
}

function talentFraction(t: number): number {
  if (TALENT_PROGRESS_CAP <= 1) return 0
  return clamp01((Math.min(t, TALENT_PROGRESS_CAP) - 1) / (TALENT_PROGRESS_CAP - 1))
}

function talentsFraction(n: number, s: number, b: number): number {
  return (talentFraction(n) + talentFraction(s) + talentFraction(b)) / 3
}

function weaponFraction(level: number | null): number {
  if (level == null) return 0
  return clamp01(level / WEAPON_MAX_LEVEL)
}

function artifactFraction(level: number, rarity: number): number {
  const max = ARTIFACT_MAX_LEVEL[rarity]
  if (!max) return 0
  return clamp01(level / max)
}

function artifactsFraction(arts: Array<[number, number]>): number {
  const scores = arts.slice(0, ARTIFACT_SLOT_COUNT).map(([l, r]) => artifactFraction(l, r))
  while (scores.length < ARTIFACT_SLOT_COUNT) scores.push(0)
  return scores.reduce((a, b) => a + b, 0) / ARTIFACT_SLOT_COUNT
}

function friendshipFraction(f: number): number {
  if (FRIENDSHIP_MAX <= 1) return 0
  return clamp01((f - 1) / (FRIENDSHIP_MAX - 1))
}

export function calculateProgress(input: ProgressInputs): ProgressBreakdown {
  const level = WEIGHTS.level * 100 * levelFraction(input.level, input.levelCap)
  const talents =
    WEIGHTS.talents *
    100 *
    talentsFraction(input.talentNormal, input.talentSkill, input.talentBurst)
  const weapon = WEIGHTS.weapon * 100 * weaponFraction(input.weaponLevel)
  const artifacts = WEIGHTS.artifacts * 100 * artifactsFraction(input.artifacts)
  const friendship = WEIGHTS.friendship * 100 * friendshipFraction(input.friendship)

  return {
    total: Math.round((level + talents + weapon + artifacts + friendship) * 100) / 100,
    level: Math.round(level * 100) / 100,
    talents: Math.round(talents * 100) / 100,
    weapon: Math.round(weapon * 100) / 100,
    artifacts: Math.round(artifacts * 100) / 100,
    friendship: Math.round(friendship * 100) / 100,
  }
}

export function countCrowns(normal: number, skill: number, burst: number): number {
  return [normal, skill, burst].filter((t) => t >= 10).length
}
