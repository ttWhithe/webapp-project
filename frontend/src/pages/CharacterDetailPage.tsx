import { useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { catalogApi } from '@/shared/api/catalog'
import { trackerApi } from '@/shared/api/tracker'
import type { UserCharacterDetail, WeaponType } from '@/shared/api/types'
import { ELEMENT_HEX, WEAPON_TYPE_LABELS } from '@/shared/lib/catalog-meta'
import { PROGRESS_LEVEL_CAP } from '@/shared/lib/progress'
import { useCharacterDraft } from '@/shared/lib/useCharacterDraft'
import { useSectionScroll } from '@/shared/lib/useSectionScroll'
import CircularProgress from '@/shared/ui/CircularProgress'
import EquipmentSlotButton from '@/shared/ui/EquipmentSlotButton'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import ProgressSlider from '@/shared/ui/ProgressSlider'
import RadialProgress, {
  type OuterSlotConfig,
  type RadialItem,
} from '@/shared/ui/RadialProgress'
import StatInput from '@/shared/ui/StatInput'

const ZONES = 4

export default function CharacterDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const qc = useQueryClient()

  const catalogQuery = useQuery({
    queryKey: ['character', slug],
    queryFn: () => catalogApi.getCharacter(slug!),
    enabled: !!slug,
  })

  const mineQuery = useQuery({
    queryKey: ['me', 'characters', slug],
    queryFn: () => trackerApi.listMine(),
    staleTime: 30_000,
  })

  const tracked = mineQuery.data?.find((c) => c.character.slug === slug)
  const detailQuery = useQuery({
    queryKey: ['me', 'characters', 'detail', tracked?.id],
    queryFn: () => trackerApi.getMine(tracked!.id),
    enabled: !!tracked,
  })

  const detail = detailQuery.data

  const handleSave = async (
    patch: Parameters<typeof trackerApi.updateMine>[1],
  ) => {
    if (!tracked) return
    await trackerApi.updateMine(tracked.id, patch)
    qc.invalidateQueries({ queryKey: ['me', 'characters', 'detail', tracked.id] })
    qc.invalidateQueries({ queryKey: ['me', 'characters'] })
  }

  const { draft, progress, isSaving, lastSaved, update } = useCharacterDraft({
    detail,
    onSave: handleSave,
  })

  const { current, goTo } = useSectionScroll(ZONES)

  const handleToggleOwned = () => {
    console.log('toggle owned clicked', { isOwned: !!tracked })
  }

  if (catalogQuery.isLoading) return <LoadingSpinner />
  if (catalogQuery.isError || !catalogQuery.data)
    return <ErrorState message="Персонаж не найден" />

  const character = catalogQuery.data

  return (
    <div className="relative">
      <div
        className="transition-transform duration-700 ease-in-out"
        style={{ transform: `translateY(-${current * 100}vh)` }}
      >
        <ZoneHero
          character={character}
          detail={detail}
          draft={draft}
          goTo={goTo}
          onToggleOwned={handleToggleOwned}
          isOwned={!!tracked}
          totalOverride={progress?.total}
        />
        <ZoneStats
          character={character}
          detail={detail}
          draft={draft}
          progress={progress}
          onUpdate={update}
          isSaving={isSaving}
          lastSaved={lastSaved}
          goTo={goTo}
        />
        <ZoneWeaponArtifacts
          character={character}
          detail={detail}
          draft={draft}
          progress={progress}
          onUpdate={update}
          goTo={goTo}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />
        <ZoneConstellations detail={detail} />
      </div>
    </div>
  )
}

/* ---------- Zone 1: Hero ---------- */

function ZoneHero({
  character,
  detail,
  draft,
  goTo,
  onToggleOwned,
  isOwned,
  totalOverride,
}: {
  character: {
    name: string
    name_ru: string | null
    element: keyof typeof ELEMENT_HEX
    title: string | null
    rarity: number
    icon_url: string | null
    portrait_url: string | null
  }
  detail: UserCharacterDetail | undefined
  draft: ReturnType<typeof useCharacterDraft>['draft']
  goTo: (i: number) => void
  onToggleOwned: () => void
  isOwned: boolean
  totalOverride?: number
}) {
  const colors = ELEMENT_HEX[character.element]

  const portraitSrc =
    detail?.custom_portrait_url ??
    character.portrait_url ??
    character.icon_url ??
    ''

  const weaponPct = draft?.weapon_level
    ? Math.min(100, (draft.weapon_level / 90) * 100)
    : 0

  const items: RadialItem[] = [
    {
      key: 'weapon',
      label: 'Оружие',
      value: weaponPct,
      icon: '⚔️',
      rawValue: draft?.weapon_level ?? 0,
      stars: draft?.weapon_refinement ?? 0,
    },
    { key: 'flower', label: 'Цветок', value: 0, icon: '🌸' },
    { key: 'plume', label: 'Перо', value: 0, icon: '🪶' },
    { key: 'sands', label: 'Часы', value: 0, icon: '⏳' },
    { key: 'goblet', label: 'Кубок', value: 0, icon: '🏺' },
    { key: 'circlet', label: 'Шапка', value: 0, icon: '👑' },
  ]

  if (detail) {
    const slotOrder: Record<string, number> = {
      flower: 1,
      plume: 2,
      sands: 3,
      goblet: 4,
      circlet: 5,
    }
    for (const a of detail.artifacts) {
      const idx = slotOrder[a.slot]
      if (idx != null) {
        const maxLevel = a.rarity === 5 ? 20 : a.rarity === 4 ? 16 : 12
        items[idx].value = Math.round((a.level / maxLevel) * 100)
      }
    }
  }

  const total = totalOverride ?? detail?.progress.total ?? 0

  const OUTER_CONFIG: OuterSlotConfig[] = [
    { hidden: true },
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },
    {
      icon: '💥',
      label: 'Взрыв стихии',
      value: draft?.talent_burst ?? 1,
      ringPercent: Math.min(100, ((draft?.talent_burst ?? 1) / 9) * 100),
      crownAt: 10,
    },
    {
      icon: '⚡',
      label: 'Элем. навык',
      value: draft?.talent_skill ?? 1,
      ringPercent: Math.min(100, ((draft?.talent_skill ?? 1) / 9) * 100),
      crownAt: 10,
    },
    {
      icon: '⚔️',
      label: 'Обычная атака',
      value: draft?.talent_normal ?? 1,
      ringPercent: Math.min(100, ((draft?.talent_normal ?? 1) / 9) * 100),
      crownAt: 10,
    },
    { hidden: true },
    {
      variant: 'plain',
      icon: isOwned ? '👤' : '➕',
      label: isOwned ? 'Убрать из трекера' : 'Добавить в трекер',
      angle: 180,
    },
    {
      icon: '📊',
      label: 'Уровень',
      value: draft?.level ?? 1,
      ringPercent: Math.min(100, ((draft?.level ?? 1) / 90) * 100),
      crownAt: 91,
    },
    {
      icon: '💚',
      label: 'Дружба',
      value: draft?.friendship ?? 1,
      ringPercent: Math.min(100, ((draft?.friendship ?? 1) / 10) * 100),
    },
  ]

  function handleOuterClick(i: number) {
    if (i >= 1 && i <= 6) goTo(3)
    else if (i >= 7 && i <= 9) goTo(1)
    else if (i === 10) onToggleOwned()
    else if (i === 12 || i === 13) goTo(1)
  }

  return (
    <section
      className="h-screen relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)`,
      }}
    >
      <div className="h-full w-full flex items-center justify-center gap-6 md:gap-12 lg:gap-24 px-6 pt-4 pb-20">
        <div
          className="relative shrink-0 rounded-2xl overflow-hidden"
          style={{
            aspectRatio: '3 / 4',
            height: 'min(84vh, 780px)',
            maxWidth: '42vw',
            boxShadow: `0 0 55px ${colors.main}99`,
          }}
        >
          {portraitSrc && (
            <img
              src={portraitSrc}
              alt={character.name}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />

          <HeroActionArc colors={colors} />
        </div>

        <RadialProgress
          total={total}
          items={items}
          colors={colors}
          size={Math.min(620, Math.round(window.innerHeight))}
          outerSlotsConfig={OUTER_CONFIG}
          onOuterClick={handleOuterClick}
          onMiddleClick={(key) => {
            if (key === 'total') {
              console.log('center circle clicked — action TBD')
            } else {
              goTo(2)
            }
          }}
          hideCenter
        />
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center max-w-[70vw]">
        <h1
          className="text-3xl md:text-4xl font-bold leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,1)]"
          style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
        >
          {character.name_ru || character.name}
        </h1>
        {character.title && (
          <p className="text-slate-300 mt-0.5 text-sm md:text-base drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
            {character.title}
          </p>
        )}
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-400 text-xs animate-pulse pointer-events-none">
        Прокрути колёсиком или свайпни ↓
      </div>
    </section>
  )
}

/* ---------- Hero action arc (bottom-left of portrait) ---------- */

function HeroActionArc({
  colors,
}: {
  colors: { main: string; secondary: string; accent: string }
}) {
  const CONTAINER = 200
  const BTN = 52
  const cx = CONTAINER - BTN / 2 - 6
  const cy = BTN / 2 + 6
  const radius = CONTAINER - BTN - 6
  const angles = [90, 112.5, 135, 157.5, 180]

  return (
    <div
      className="absolute bottom-3 left-3 z-20 rounded-2xl"
      style={{
        width: CONTAINER,
        height: CONTAINER,
        backgroundColor: `${colors.secondary}33`,
        border: `1.5px solid ${colors.secondary}99`,
        backdropFilter: 'blur(8px)',
        boxShadow: `inset 0 0 30px ${colors.main}22`,
      }}
    >
      {angles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const x = cx + radius * Math.cos(rad)
        const y = cy + radius * Math.sin(rad)
        const isBack = i === 2

        if (isBack) {
          return (
            <Link
              key={i}
              to="/characters"
              title="К каталогу"
              className="absolute rounded-full flex items-center justify-center text-2xl font-bold transition-transform duration-300 hover:scale-110"
              style={{
                width: BTN,
                height: BTN,
                left: x - BTN / 2,
                top: y - BTN / 2,
                backgroundColor: colors.main,
                border: `2.5px solid ${colors.secondary}`,
                color: colors.secondary,
                boxShadow: `0 0 22px ${colors.main}, 0 0 10px ${colors.accent}66`,
              }}
            >
              ←
            </Link>
          )
        }

        return (
          <button
            key={i}
            type="button"
            disabled
            title="Скоро"
            className="absolute rounded-full cursor-not-allowed"
            style={{
              width: BTN,
              height: BTN,
              left: x - BTN / 2,
              top: y - BTN / 2,
              backgroundColor: `${colors.main}55`,
              border: `1.5px solid ${colors.secondary}aa`,
              opacity: 0.6,
            }}
          />
        )
      })}
    </div>
  )
}

/* ---------- Zone 2: Stats ---------- */

function ZoneStats({
  character,
  detail,
  draft,
  progress,
  onUpdate,
  isSaving,
  lastSaved,
  goTo,
}: {
  character: {
    name: string
    name_ru: string | null
    element: keyof typeof ELEMENT_HEX
    icon_url: string | null
  }
  detail: UserCharacterDetail | undefined
  draft: ReturnType<typeof useCharacterDraft>['draft']
  progress: ReturnType<typeof useCharacterDraft>['progress']
  onUpdate: ReturnType<typeof useCharacterDraft>['update']
  isSaving: boolean
  lastSaved: Date | null
  goTo: (i: number) => void
}) {
  const colors = ELEMENT_HEX[character.element]

  if (!detail || !draft || !progress) {
    return (
      <section className="h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Характеристики</h2>
          <p className="text-slate-400 mb-6">
            Этот персонаж пока не в вашем трекере. Добавьте его, чтобы видеть
            прогресс и редактировать данные.
          </p>
          <AddToTrackerButton />
        </div>
      </section>
    )
  }

  return (
    <section
      className="h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)`,
      }}
    >
      <div className="w-full max-w-[1800px] grid grid-cols-1 lg:grid-cols-[320px_1fr_500px] gap-6 px-6">
        <div className="flex flex-col gap-4 -translate-y-[40px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              {character.name_ru || character.name}
            </h2>
            <p className="text-sm text-slate-400">Характеристики</p>
          </div>

          {character.icon_url && (
            <div
              className="mx-[10px] rounded-xl overflow-hidden"
              style={{
                border: `2px solid ${colors.secondary}`,
                boxShadow: `0 0 28px ${colors.main}66`,
                aspectRatio: '1 / 1',
              }}
            >
              <img
                src={character.icon_url}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <StatInput
              label="HP"
              value={draft.custom_hp}
              onChange={(v) => onUpdate('custom_hp', v)}
              colors={colors}
              min={0}
            />
            <StatInput
              label="ATK"
              value={draft.custom_atk}
              onChange={(v) => onUpdate('custom_atk', v)}
              colors={colors}
              min={0}
            />
            <StatInput
              label="DEF"
              value={draft.custom_def}
              onChange={(v) => onUpdate('custom_def', v)}
              colors={colors}
              min={0}
            />
            <StatInput
              label="EM"
              value={draft.custom_em}
              onChange={(v) => onUpdate('custom_em', v)}
              colors={colors}
              min={0}
            />
            <StatInput
              label="CRIT Rate"
              value={draft.custom_crit_rate}
              onChange={(v) => onUpdate('custom_crit_rate', v)}
              suffix="%"
              colors={colors}
              min={0}
              max={200}
              step={0.1}
            />
            <StatInput
              label="CRIT DMG"
              value={draft.custom_crit_dmg}
              onChange={(v) => onUpdate('custom_crit_dmg', v)}
              suffix="%"
              colors={colors}
              min={0}
              max={500}
              step={0.1}
            />
            <StatInput
              label="Energy Recharge"
              value={draft.custom_energy_recharge}
              onChange={(v) => onUpdate('custom_energy_recharge', v)}
              suffix="%"
              colors={colors}
              min={0}
              max={500}
              step={0.1}
            />
            <StatInput
              label="Elem. DMG Bonus"
              value={draft.custom_elemental_dmg_bonus}
              onChange={(v) => onUpdate('custom_elemental_dmg_bonus', v)}
              suffix="%"
              colors={colors}
              min={0}
              max={500}
              step={0.1}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3 px-[50px]">
          <ProgressSlider
            label="Уровень персонажа"
            value={draft.level}
            min={1}
            max={draft.level_cap}
            onChange={(v) => onUpdate('level', v)}
            icon="📊"
            colors={colors}
            crownAt={PROGRESS_LEVEL_CAP + 1}
            ringCap={PROGRESS_LEVEL_CAP}
          />
          <ProgressSlider
            label="Уровень дружбы"
            value={draft.friendship}
            min={1}
            max={10}
            onChange={(v) => onUpdate('friendship', v)}
            icon="💚"
            colors={colors}
            ringCap={10}
          />

          <div className="flex items-center gap-3 my-2">
            <div
              className="flex-1 h-[2px] rounded-full"
              style={{ backgroundColor: colors.secondary }}
            />
            <span
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: colors.accent }}
            >
              Таланты
            </span>
            <div
              className="flex-1 h-[2px] rounded-full"
              style={{ backgroundColor: colors.secondary }}
            />
          </div>

          <ProgressSlider
            label="Обычная атака"
            value={draft.talent_normal}
            min={1}
            max={10}
            onChange={(v) => onUpdate('talent_normal', v)}
            icon="⚔️"
            colors={colors}
            crownAt={10}
            ringCap={9}
          />
          <ProgressSlider
            label="Элементарный навык"
            value={draft.talent_skill}
            min={1}
            max={10}
            onChange={(v) => onUpdate('talent_skill', v)}
            icon="⚡"
            colors={colors}
            crownAt={10}
            ringCap={9}
          />
          <ProgressSlider
            label="Взрыв стихии"
            value={draft.talent_burst}
            min={1}
            max={10}
            onChange={(v) => onUpdate('talent_burst', v)}
            icon="💥"
            colors={colors}
            crownAt={10}
            ringCap={9}
          />
        </div>

        <div className="hidden lg:flex items-center justify-center">
          <button
            type="button"
            onClick={() => goTo(0)}
            title="Вернуться к персонажу"
            className="relative transition-transform duration-300 hover:scale-105 cursor-pointer"
            style={{ width: 400, height: 400, background: 'transparent', border: 'none', padding: 0 }}
          >
            <CircularProgress
              value={progress.total}
              size={400}
              strokeWidth={26}
              fillColor={colors.secondary}
              emptyColor={colors.main}
              innerColor={colors.main}
              borderColor={colors.secondary}
              textColor={colors.secondary}
              textStroke={colors.accent}
              borderWidth={6}
            />
          </button>
        </div>
      </div>

      <div className="absolute top-6 right-6 text-xs text-slate-400 flex items-center gap-2">
        {isSaving ? (
          <span className="text-yellow-400">● Сохранение...</span>
        ) : lastSaved ? (
          <span className="text-green-400">
            ✓ Сохранено {lastSaved.toLocaleTimeString().slice(0, 5)}
          </span>
        ) : null}
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-400 text-xs animate-pulse pointer-events-none">
        Прокрути колёсиком или свайпни ↓
      </div>
    </section>
  )
}

/* ---------- Zone 3: Weapon + Artifacts ---------- */

type EquipmentSlotKey = 'weapon' | 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'

const EQUIPMENT_SLOTS: { key: EquipmentSlotKey; icon: string; label: string }[] = [
  { key: 'weapon', icon: '⚔️', label: 'Оружие' },
  { key: 'flower', icon: '🌸', label: 'Цветок' },
  { key: 'plume', icon: '🪶', label: 'Перо' },
  { key: 'sands', icon: '⏳', label: 'Часы' },
  { key: 'goblet', icon: '🏺', label: 'Кубок' },
  { key: 'circlet', icon: '👑', label: 'Шапка' },
]

const ARTIFACT_MAX_LEVEL: Record<number, number> = {
  1: 4,
  2: 4,
  3: 12,
  4: 16,
  5: 20,
}

function ZoneWeaponArtifacts({
  character,
  detail,
  draft,
  progress,
  onUpdate,
  goTo,
  isSaving,
  lastSaved,
}: {
  character: {
    name: string
    name_ru: string | null
    element: keyof typeof ELEMENT_HEX
    icon_url: string | null
    weapon_type: WeaponType
  }
  detail: UserCharacterDetail | undefined
  draft: ReturnType<typeof useCharacterDraft>['draft']
  progress: ReturnType<typeof useCharacterDraft>['progress']
  onUpdate: ReturnType<typeof useCharacterDraft>['update']
  goTo: (i: number) => void
  isSaving: boolean
  lastSaved: Date | null
}) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotKey>('weapon')
  const colors = ELEMENT_HEX[character.element]

  const weaponsQuery = useQuery({
    queryKey: ['weapons', character.weapon_type],
    queryFn: () =>
      catalogApi.listWeapons({
        weapon_type: character.weapon_type,
        sort: 'rarity_desc',
        limit: 200,
      }),
    enabled: selectedSlot === 'weapon' && !!detail && !!draft,
    staleTime: 5 * 60_000,
  })

  if (!detail || !draft || !progress) {
    return (
      <section className="h-screen flex items-center justify-center text-slate-500">
        Нет данных об экипировке
      </section>
    )
  }

  const refinement = draft.weapon_refinement ?? 1

  const weaponPct = draft.weapon_level
    ? Math.min(100, (draft.weapon_level / 90) * 100)
    : 0

  function artifactSlotPct(slot: string): number {
    const a = detail!.artifacts.find((x) => x.slot === slot)
    if (!a) return 0
    const maxLevel = ARTIFACT_MAX_LEVEL[a.rarity] ?? 20
    return Math.min(100, (a.level / maxLevel) * 100)
  }

  function slotProgress(key: EquipmentSlotKey): number {
    if (key === 'weapon') return weaponPct
    return artifactSlotPct(key)
  }

  function slotFilled(key: EquipmentSlotKey): boolean {
    if (key === 'weapon') return detail!.weapon != null
    return detail!.artifacts.some((a) => a.slot === key)
  }

  const selectedMeta = EQUIPMENT_SLOTS.find((s) => s.key === selectedSlot)!
  const selectedPct =
    selectedSlot === 'weapon' ? weaponPct : artifactSlotPct(selectedSlot)

  const selectedWeapon =
    selectedSlot === 'weapon' && draft.weapon_id
      ? weaponsQuery.data?.items.find((w) => w.id === draft.weapon_id)
      : null

  return (
    <section
      className="h-screen relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)`,
      }}
    >
      <div className="h-full w-full max-w-[1800px] mx-auto px-6 py-6 flex flex-col gap-5">
        {/* === Header row: icon+name | slots | total | saving === */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            {character.icon_url && (
              <div
                className="w-16 h-16 rounded-xl overflow-hidden shrink-0"
                style={{
                  border: `2px solid ${colors.secondary}`,
                  boxShadow: `0 0 20px ${colors.main}66`,
                }}
              >
                <img
                  src={character.icon_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h2
                className="text-2xl font-bold whitespace-nowrap"
                style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
              >
                {character.name_ru || character.name}
              </h2>
              <p className="text-sm text-slate-400">Экипировка</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EquipmentSlotButton
              icon={EQUIPMENT_SLOTS[0].icon}
              label={EQUIPMENT_SLOTS[0].label}
              selected={selectedSlot === 'weapon'}
              filled={slotFilled('weapon')}
              progress={slotProgress('weapon')}
              levelText={draft.weapon_level != null ? String(draft.weapon_level) : undefined}
              stars={refinement}
              colors={colors}
              onClick={() => setSelectedSlot('weapon')}
            />

            <div
              className="h-16 w-[3px] rounded-full"
              style={{ backgroundColor: colors.secondary }}
            />

            {EQUIPMENT_SLOTS.slice(1).map((slot) => {
              const a = detail.artifacts.find((x) => x.slot === slot.key)
              return (
                <EquipmentSlotButton
                  key={slot.key}
                  icon={slot.icon}
                  label={slot.label}
                  selected={selectedSlot === slot.key}
                  filled={slotFilled(slot.key)}
                  progress={slotProgress(slot.key)}
                  levelText={a ? String(a.level) : undefined}
                  colors={colors}
                  onClick={() => setSelectedSlot(slot.key)}
                />
              )
            })}

            <div
              className="h-16 w-[3px] rounded-full"
              style={{ backgroundColor: colors.secondary }}
            />

            <button
              type="button"
              onClick={() => goTo(0)}
              title="Вернуться к персонажу"
              className="relative shrink-0 rounded-full transition-transform duration-200 hover:scale-110 cursor-pointer"
              style={{ width: 128, height: 128 }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${colors.secondary} 0deg ${Math.min(100, progress.total) * 3.6}deg, ${colors.main} ${Math.min(100, progress.total) * 3.6}deg 360deg)`,
                  border: `5px solid ${colors.secondary}`,
                  boxSizing: 'border-box',
                  boxShadow: `0 0 26px ${colors.accent}66, 0 0 12px ${colors.main}`,
                }}
              />
              <div
                className="absolute rounded-full flex items-center justify-center"
                style={{
                  top: '18%',
                  left: '18%',
                  right: '18%',
                  bottom: '18%',
                  backgroundColor: colors.main,
                  border: `3px solid ${colors.secondary}`,
                  boxSizing: 'border-box',
                }}
              >
                <span
                  className="font-bold leading-none"
                  style={{
                    color: colors.accent,
                    fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                    fontSize: 26,
                    textShadow: `0 0 4px ${colors.secondary}`,
                  }}
                >
                  {Math.round(progress.total)}%
                </span>
              </div>
            </button>
          </div>

          <div className="text-xs text-slate-400 shrink-0 min-w-[140px] text-right">
            {isSaving ? (
              <span className="text-yellow-400">● Сохранение...</span>
            ) : lastSaved ? (
              <span className="text-green-400">
                ✓ Сохранено {lastSaved.toLocaleTimeString().slice(0, 5)}
              </span>
            ) : null}
          </div>
        </div>

        {/* === Main content === */}
        <div className="flex-1 min-h-0 grid grid-cols-[380px_1fr] gap-6">
          {/* LEFT: big circle + refinement arc + level slider */}
          <div className="flex flex-col items-center gap-4 relative">
            <div
              className="relative flex items-center justify-center"
              style={{ width: 400, height: 400 }}
            >
              <div className="relative" style={{ width: 260, height: 260 }}>
                <CircularProgress
                  value={selectedPct}
                  size={260}
                  strokeWidth={26}
                  fillColor={colors.secondary}
                  emptyColor={colors.main}
                  innerColor={colors.main}
                  borderColor={colors.secondary}
                  hideLabel
                  borderWidth={5}
                />

                {/* Selected item — image or emoji */}
                {selectedWeapon?.icon_url ? (
                  <img
                    src={selectedWeapon.icon_url}
                    alt={selectedWeapon.name}
                    className="absolute rounded-full object-cover pointer-events-none"
                    style={{
                      top: '18%',
                      left: '18%',
                      width: '64%',
                      height: '64%',
                    }}
                  />
                ) : (
                  <span
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                    style={{ fontSize: 96, lineHeight: 1, paddingBottom: 40 }}
                  >
                    {selectedMeta.icon}
                  </span>
                )}

                {/* Level + stars at the bottom of the circle */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 flex items-start font-bold pointer-events-none"
                  style={{
                    bottom: 10,
                    color: colors.accent,
                    fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                    fontSize: 42,
                    textShadow: `0 0 5px ${colors.secondary}`,
                    lineHeight: 1,
                  }}
                >
                  {selectedSlot === 'weapon' ? (
                    <>
                      <span>{draft.weapon_level ?? 0}</span>
                      {refinement > 0 && (
                        <span
                          style={{
                            fontSize: '0.5em',
                            color: '#fde047',
                            marginLeft: 3,
                            marginTop: -4,
                          }}
                        >
                          ★{refinement}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>
                      {detail.artifacts.find((a) => a.slot === selectedSlot)?.level ?? 0}
                    </span>
                  )}
                </div>

                {/* Refinement arc — only for weapon */}
                {selectedSlot === 'weapon' && (
                  <RefinementArc
                    value={refinement}
                    colors={colors}
                    size={260}
                    onChange={(v) => {
                      onUpdate('weapon_refinement' as never, v as never)
                    }}
                  />
                )}
              </div>
            </div>

            {selectedSlot === 'weapon' ? (
              <div className="w-full">
                <SimpleSlider
                  label="Уровень оружия"
                  value={draft.weapon_level ?? 1}
                  min={1}
                  max={90}
                  onChange={(v) => onUpdate('weapon_level' as never, v as never)}
                  colors={colors}
                />
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center">
                Артефакт «{selectedMeta.label}» — детали в D9e
              </p>
            )}
          </div>

          {/* RIGHT: grid */}
          <div className="relative rounded-xl border border-slate-700 bg-slate-900/40 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              {selectedSlot === 'weapon' ? (
                weaponsQuery.isLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    Загрузка оружия...
                  </div>
                ) : weaponsQuery.isError ? (
                  <div className="h-full flex items-center justify-center text-red-400 text-sm">
                    Не удалось загрузить оружие
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {(weaponsQuery.data?.items ?? []).map((w) => {
                      const isSelected = draft.weapon_id === w.id
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            const switching = draft.weapon_id !== w.id
                            onUpdate('weapon_id' as never, w.id as never)
                            if (switching) {
                              onUpdate('weapon_level' as never, 1 as never)
                              onUpdate('weapon_refinement' as never, 1 as never)
                            }
                          }}
                          title={`${w.name} · ${WEAPON_TYPE_LABELS[w.weapon_type]} · ★${w.rarity}`}
                          className={`relative aspect-square rounded-lg overflow-hidden transition-transform duration-200 cursor-pointer ${
                            isSelected ? 'scale-105' : 'hover:scale-105'
                          }`}
                          style={{
                            border: `${isSelected ? 4 : 2}px solid ${isSelected ? colors.accent : colors.secondary}`,
                            boxShadow: isSelected
                              ? `0 0 20px ${colors.accent}88`
                              : `0 0 6px ${colors.main}44`,
                            backgroundColor: colors.main,
                          }}
                        >
                          {w.icon_url && (
                            <img
                              src={w.icon_url}
                              alt={w.name}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                          <span
                            className="absolute top-1 right-1 px-1 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: colors.secondary,
                              color: '#fde047',
                            }}
                          >
                            ★{w.rarity}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Выбор артефактов появится в D9e
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Zone 4: Constellations (placeholder) ---------- */

function ZoneConstellations({
  detail,
}: {
  detail: UserCharacterDetail | undefined
}) {
  return (
    <section className="h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-3xl font-bold mb-4">Созвездия</h2>
        {detail ? (
          <p className="text-slate-400">
            Уровень созвездий:{' '}
            <span className="text-yellow-300 font-bold">C{detail.constellation}</span>
          </p>
        ) : (
          <p className="text-slate-500">Добавьте персонажа в трекер</p>
        )}
        <p className="text-slate-500 mt-4 text-sm">
          Детальный разбор созвездий — в следующих версиях.
        </p>
      </div>
    </section>
  )
}

/* ---------- Shared UI ---------- */

function AddToTrackerButton() {
  return (
    <Link
      to="/me/characters"
      className="inline-block px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 font-medium"
    >
      Перейти в трекер
    </Link>
  )
}

function RefinementArc({
  value,
  colors,
  size,
  onChange,
}: {
  value: number
  colors: { main: string; secondary: string; accent: string }
  size: number
  onChange: (v: number) => void
}) {
  const BTN = 80
  const radius = size * 0.6
  const cx = size / 2
  const cy = size / 2

  return (
    <>
      {[1, 2, 3, 4, 5].map((rank) => {
        const deg = 30 + (rank - 1) * 30
        const rad = (deg * Math.PI) / 180
        const x = cx + radius * Math.sin(rad)
        const y = cy - radius * Math.cos(rad)
        const active = value === rank

        return (
          <button
            key={rank}
            type="button"
            onClick={() => onChange(rank)}
            title={`Ранг пробуждения ${rank}`}
            className="absolute rounded-full flex flex-col items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
            style={{
              width: BTN,
              height: BTN,
              left: x - BTN / 2,
              top: y - BTN / 2,
              backgroundColor: colors.main,
              border: `3px solid ${colors.secondary}`,
              boxShadow: active
                ? `0 0 24px ${colors.accent}88, 0 0 10px ${colors.main}`
                : `0 0 10px ${colors.main}55`,
              opacity: active ? 1 : 0.5,
              zIndex: active ? 10 : 5,
            }}
          >
            <span
              className="leading-none font-bold"
              style={{
                color: active ? '#fde047' : colors.accent,
                fontSize: 30,
                lineHeight: 1,
              }}
            >
              ★
            </span>
            <span
              className="leading-none font-bold"
              style={{
                color: active ? '#fde047' : colors.accent,
                fontSize: 22,
                fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                lineHeight: 1,
                marginTop: 2,
              }}
            >
              {rank}
            </span>
          </button>
        )
      })}
    </>
  )
}

function SimpleSlider({
  label,
  value,
  min,
  max,
  onChange,
  colors,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  colors: { main: string; secondary: string; accent: string }
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  const bg = `linear-gradient(to right,
    ${colors.secondary} 0%,
    ${colors.secondary} ${pct}%,
    ${colors.accent} ${pct}%,
    ${colors.accent} 100%)`

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 rounded-2xl"
      style={{
        backgroundColor: colors.main,
        border: `3px solid ${colors.secondary}`,
        boxShadow: `0 0 16px ${colors.main}44`,
      }}
    >
      <div
        className="text-lg font-semibold text-center"
        style={{
          color: colors.accent,
          fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
        }}
      >
        {label}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: bg,
          // @ts-expect-error custom CSS variable
          '--thumb-color': colors.secondary,
        }}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[var(--thumb-color)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[var(--thumb-color)]
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  )
}
