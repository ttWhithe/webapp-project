import { useCallback, useEffect, useRef, useState } from 'react'

import type { UserCharacterDetail } from '@/shared/api/types'
import { calculateProgress, type ProgressBreakdown } from '@/shared/lib/progress'

type Draft = Pick<
  UserCharacterDetail,
  | 'level'
  | 'level_cap'
  | 'friendship'
  | 'talent_normal'
  | 'talent_skill'
  | 'talent_burst'
  | 'custom_hp'
  | 'custom_atk'
  | 'custom_def'
  | 'custom_em'
  | 'custom_crit_rate'
  | 'custom_crit_dmg'
  | 'custom_energy_recharge'
  | 'custom_elemental_dmg_bonus'
>

export interface UseCharacterDraftResult {
  draft: Draft | null
  progress: ProgressBreakdown | null
  isDirty: boolean
  isSaving: boolean
  lastSaved: Date | null
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void
}

interface Options {
  detail: UserCharacterDetail | undefined
  onSave: (patch: Partial<Draft>) => Promise<void>
  debounceMs?: number
}

/**
 * Local editing state for a tracked character.
 * - Keeps a "draft" copy of the editable fields.
 * - Recomputes progress client-side on every change (instant UI feedback).
 * - Debounces PATCH to the server (default 800ms after last change).
 */
export function useCharacterDraft({
  detail,
  onSave,
  debounceMs = 800,
}: Options): UseCharacterDraftResult {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPatch = useRef<Partial<Draft>>({})

  // Hydrate draft when detail arrives / changes externally.
  // setState inside effect is the intended pattern here — syncing local edit
  // state from a prop that arrives asynchronously.
  useEffect(() => {
    if (!detail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(null)
      return
    }
    setDraft({
      level: detail.level,
      level_cap: detail.level_cap,
      friendship: detail.friendship,
      talent_normal: detail.talent_normal,
      talent_skill: detail.talent_skill,
      talent_burst: detail.talent_burst,
      custom_hp: detail.custom_hp,
      custom_atk: detail.custom_atk,
      custom_def: detail.custom_def,
      custom_em: detail.custom_em,
      custom_crit_rate: detail.custom_crit_rate,
      custom_crit_dmg: detail.custom_crit_dmg,
      custom_energy_recharge: detail.custom_energy_recharge,
      custom_elemental_dmg_bonus: detail.custom_elemental_dmg_bonus,
    })
  }, [detail])

  // Progress — recompute on every draft change (client-side formula)
  const progress = draft && detail
    ? calculateProgress({
        level: draft.level,
        levelCap: draft.level_cap,
        friendship: draft.friendship,
        talentNormal: draft.talent_normal,
        talentSkill: draft.talent_skill,
        talentBurst: draft.talent_burst,
        weaponLevel: detail.weapon_level,
        weaponRefinement: detail.weapon_refinement,
        artifacts: detail.artifacts.map((a) => [a.level, a.rarity] as [number, number]),
      })
    : null

  const update = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) => {
      setDraft((prev) => {
        if (!prev) return prev
        if (prev[key] === value) return prev
        return { ...prev, [key]: value }
      })
      setIsDirty(true)
      pendingPatch.current[key] = value

      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const patch = { ...pendingPatch.current }
        pendingPatch.current = {}
        if (Object.keys(patch).length === 0) return

        setIsSaving(true)
        try {
          await onSave(patch)
          setIsDirty(false)
          setLastSaved(new Date())
        } finally {
          setIsSaving(false)
        }
      }, debounceMs)
    },
    [onSave, debounceMs],
  )

  // Cleanup on unmount: flush pending save immediately
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        const patch = { ...pendingPatch.current }
        if (Object.keys(patch).length > 0) {
          // best-effort flush
          void onSave(patch)
        }
      }
    }
  }, [onSave])

  return { draft, progress, isDirty, isSaving, lastSaved, update }
}
