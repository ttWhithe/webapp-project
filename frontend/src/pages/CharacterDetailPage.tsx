import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { catalogApi } from '@/shared/api/catalog'
import { trackerApi } from '@/shared/api/tracker'
import type { UserCharacterDetail } from '@/shared/api/types'
import { ELEMENT_HEX, WEAPON_TYPE_LABELS } from '@/shared/lib/catalog-meta'
import { useSectionScroll } from '@/shared/lib/useSectionScroll'
import CircularProgress from '@/shared/ui/CircularProgress'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import RadialProgress, {
  type OuterSlotConfig,
  type RadialItem,
} from '@/shared/ui/RadialProgress'

const ZONES = 4

export default function CharacterDetailPage() {
  const { slug } = useParams<{ slug: string }>()

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

  const { current, goTo } = useSectionScroll(ZONES)

  // --- Toggle owned (add/remove from tracker) ---
  // TODO: wire to POST/DELETE /me/characters + invalidate queries + cooldown.
  const handleToggleOwned = () => {
    console.log('toggle owned clicked', { isOwned: !!tracked })
  }

  if (catalogQuery.isLoading) return <LoadingSpinner />
  if (catalogQuery.isError || !catalogQuery.data)
    return <ErrorState message="Персонаж не найден" />

  const character = catalogQuery.data
  const detail = detailQuery.data

  return (
    <div className="relative">
      {/* Vertical scroller */}
      <div
        className="transition-transform duration-700 ease-in-out"
        style={{ transform: `translateY(-${current * 100}vh)` }}
      >
        <ZoneHero
          character={character}
          detail={detail}
          goTo={goTo}
          onToggleOwned={handleToggleOwned}
          isOwned={!!tracked}
        />
        <ZoneStats character={character} detail={detail} />
        <ZoneWeaponArtifacts detail={detail} />
        <ZoneConstellations character={character} detail={detail} />
      </div>
    </div>
  )
}

/* ---------- Zone 1: Hero + portrait + dot navigation ---------- */

function ZoneHero({
  character,
  detail,
  goTo,
  onToggleOwned,
  isOwned,
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
  goTo: (i: number) => void
  onToggleOwned: () => void
  isOwned: boolean
}) {
  const colors = ELEMENT_HEX[character.element]

  const portraitSrc =
    detail?.custom_portrait_url ??
    character.portrait_url ??
    character.icon_url ??
    ''

  const items: RadialItem[] = [
    { key: 'weapon', label: 'Оружие', value: detail?.progress.weapon ?? 0, icon: '⚔️' },
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

  const total = detail?.progress.total ?? 0

  // Per-slot config for 14 outer circles
  // 0, 11 — hidden
  // 1-6 — constellations (plain, no progress)
  // 7-9 — talents (ult/skill/atk) → zone 2
  // 10 — toggle owned
  // 12-13 — level/friendship → zone 2
  const OUTER_CONFIG: OuterSlotConfig[] = [
    { hidden: true },                                       // 0
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },   // 1
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },   // 2
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },   // 3
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },   // 4
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },   // 5
    { variant: 'plain', icon: '🌟', label: 'Созвездия' },   // 6
    { icon: '💥', label: 'Взрыв стихии' },                  // 7
    { icon: '⚡', label: 'Элем. навык' },                    // 8
    { icon: '⚔️', label: 'Обычная атака' },                 // 9
    { icon: isOwned ? '👤' : '➕', label: isOwned ? 'Убрать из трекера' : 'Добавить в трекер' }, // 10
    { hidden: true },                                       // 11
    { icon: '📊', label: 'Уровень' },                        // 12
    { icon: '💚', label: 'Дружба' },                         // 13
  ]

  function handleOuterClick(i: number) {
    if (i >= 1 && i <= 6) goTo(3)         // constellations zone
    else if (i >= 7 && i <= 9) goTo(1)    // stats/talents zone
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
      {/* Portrait + radial — centered vertically across FULL height, no padding-top */}
      <div className="h-full w-full flex items-center justify-center gap-6 md:gap-12 lg:gap-24 px-6 pt-4 pb-20">
        {/* Portrait */}
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

        {/* Radial progress */}
        <RadialProgress
          total={total}
          items={items}
          colors={colors}
          size={Math.min(620, Math.round(window.innerHeight))}
          outerSlotsConfig={OUTER_CONFIG}
          onOuterClick={handleOuterClick}
          onMiddleClick={(key) => {
            // Center (total) — placeholder, will be wired later.
            // 6 equipment slots (weapon + 5 artifacts) → Zone 3
            if (key === 'total') {
              console.log('center circle clicked — action TBD')
            } else {
              goTo(2)
            }
          }}
        />
      </div>

      {/* Name + title — ABSOLUTE, over the whole section, above portrait, centered horizontally */}
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
/**
 * Square glass container anchored to the bottom-left corner of the portrait.
 * 5 buttons distributed evenly along a quarter-circle arc (90° → 180°),
 * occupying the whole container surface.
 *
 *   index 0 — 90°   (bottom-center of arc)   → placeholder (disabled)
 *   index 1 — 112.5°                         → placeholder (disabled)
 *   index 2 — 135°   (diagonal)              → BACK to catalog
 *   index 3 — 157.5°                         → placeholder (disabled)
 *   index 4 — 180°   (left-center of arc)    → placeholder (disabled)
 */
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
  // Quarter-circle: 90° (bottom) → 180° (left), y grows downward
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
}: {
  character: { name_ru: string | null; name: string }
  detail: UserCharacterDetail | undefined
}) {
  if (!detail) {
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
    <section className="h-screen flex items-center justify-center px-4 py-24 overflow-y-auto">
      <div className="w-full max-w-3xl space-y-6">
        <h2 className="text-3xl font-bold">Прокачка</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Уровень" value={`${detail.level} / ${detail.level_cap}`} />
          <StatCard label="Дружба" value={`${detail.friendship} / 10`} />
          <StatCard label="Созвездия" value={`C${detail.constellation}`} />
        </div>

        <h3 className="text-xl font-bold pt-4">Таланты</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Обычная атака" value={`${detail.talent_normal} / 13`} />
          <StatCard label="Элементарный навык" value={`${detail.talent_skill} / 13`} />
          <StatCard label="Взрыв стихии" value={`${detail.talent_burst} / 13`} />
        </div>

        <h3 className="text-xl font-bold pt-4">Кастомные статы</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="HP" value={detail.custom_hp?.toString() ?? '—'} />
          <StatCard label="ATK" value={detail.custom_atk?.toString() ?? '—'} />
          <StatCard label="DEF" value={detail.custom_def?.toString() ?? '—'} />
          <StatCard label="EM" value={detail.custom_em?.toString() ?? '—'} />
          <StatCard label="CRIT Rate" value={detail.custom_crit_rate != null ? `${detail.custom_crit_rate}%` : '—'} />
          <StatCard label="CRIT DMG" value={detail.custom_crit_dmg != null ? `${detail.custom_crit_dmg}%` : '—'} />
          <StatCard label="Energy Recharge" value={detail.custom_energy_recharge != null ? `${detail.custom_energy_recharge}%` : '—'} />
          <StatCard label="Elem. DMG Bonus" value={detail.custom_elemental_dmg_bonus != null ? `${detail.custom_elemental_dmg_bonus}%` : '—'} />
        </div>

        <div className="pt-6 flex justify-center">
          <CircularProgress
            value={detail.progress.total}
            size={120}
            strokeWidth={10}
            fillColor="#818cf8"
            emptyColor="#334155"
            innerColor="#1e293b"
            borderColor="#6366f1"
            textColor="#c7d2fe"
          />
        </div>
        <p className="text-center text-slate-400 text-sm">
          Общий прогресс: {detail.progress.total}%
        </p>
      </div>
    </section>
  )
}

/* ---------- Zone 3: Weapon + Artifacts ---------- */

function ZoneWeaponArtifacts({ detail }: { detail: UserCharacterDetail | undefined }) {
  if (!detail) {
    return (
      <section className="h-screen flex items-center justify-center text-slate-500">
        Нет данных об экипировке
      </section>
    )
  }

  return (
    <section className="h-screen flex items-center justify-center px-4 py-24 overflow-y-auto">
      <div className="w-full max-w-3xl space-y-6">
        <h2 className="text-3xl font-bold">Оружие и артефакты</h2>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-lg font-semibold mb-3">Оружие</h3>
          {detail.weapon ? (
            <div className="flex items-center gap-4">
              {detail.weapon.icon_url && (
                <img
                  src={detail.weapon.icon_url}
                  alt={detail.weapon.name}
                  className="w-16 h-16 rounded bg-slate-900 object-cover"
                />
              )}
              <div>
                <div className="font-medium">{detail.weapon.name}</div>
                <div className="text-sm text-slate-400">
                  {WEAPON_TYPE_LABELS[detail.weapon.weapon_type]} • ★
                  {detail.weapon.rarity}
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  Lv. {detail.weapon_level ?? '—'} • R{detail.weapon_refinement ?? '—'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">Не задано</p>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-lg font-semibold mb-3">
            Артефакты ({detail.artifacts.length} / 5)
          </h3>
          {detail.artifacts.length === 0 ? (
            <p className="text-slate-500">Не задано</p>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {detail.artifacts.map((a) => (
                <div
                  key={a.id}
                  className="bg-slate-900 rounded-lg p-2 text-center text-xs space-y-1"
                  title={a.set_name}
                >
                  <div className="text-slate-400 capitalize">{a.slot}</div>
                  <div className="text-yellow-300">★{a.rarity}</div>
                  <div className="text-slate-200">+{a.level}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------- Zone 4: Constellations (placeholder) ---------- */

function ZoneConstellations({
  character,
  detail,
}: {
  character: { name_ru: string | null; name: string }
  detail: UserCharacterDetail | undefined
}) {
  return (
    <section className="h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-3xl font-bold mb-4">Созвездия</h2>
        {detail ? (
          <p className="text-slate-400">
            Уровень созвездий: <span className="text-yellow-300 font-bold">C{detail.constellation}</span>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  )
}

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
