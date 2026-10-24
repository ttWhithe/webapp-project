import { useCallback, useEffect, useRef, useState } from 'react'

import type { UserCharacterDetail, UserArtifactRead } from '@/shared/api/types'
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
  | 'weapon_id'
  | 'weapon_level'
  | 'weapon_refinement'
> & {
  artifacts: UserArtifactRead[]
}

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

  const onSaveRef = useRef(onSave)
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!detail) {
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
      weapon_id: detail.weapon_id,
      weapon_level: detail.weapon_level,
      weapon_refinement: detail.weapon_refinement,
      artifacts: detail.artifacts || [],
    })
  }, [detail])

  const progress =
    draft && detail
      ? calculateProgress({
          level: draft.level,
          levelCap: draft.level_cap,
          friendship: draft.friendship,
          talentNormal: draft.talent_normal,
          talentSkill: draft.talent_skill,
          talentBurst: draft.talent_burst,
          weaponLevel: draft.weapon_level,
          weaponRefinement: draft.weapon_refinement,
          artifacts: draft.artifacts.map(
            (a) => [a.level, a.rarity] as [number, number],
          ),
        })
      : null

  const update = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) => {
      setDraft((prev) => {
        if (!prev) return prev
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
          await onSaveRef.current(patch)
          setIsDirty(false)
          setLastSaved(new Date())
        } finally {
          setIsSaving(false)
        }
      }, debounceMs)
    },
    [debounceMs],
  )

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        const patch = { ...pendingPatch.current }
        pendingPatch.current = {}
        if (Object.keys(patch).length > 0) {
          void onSaveRef.current(patch)
        }
      }
    }
  }, [])

  return { draft, progress, isDirty, isSaving, lastSaved, update }
}
