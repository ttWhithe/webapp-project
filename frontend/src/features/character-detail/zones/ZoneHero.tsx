import { ELEMENT_HEX } from '@/shared/lib/catalog-meta'
import RadialProgress, { type OuterSlotConfig, type RadialItem } from '@/shared/ui/RadialProgress'
import { ARTIFACT_MAX_LEVEL, PLACEHOLDER_ICONS } from '../constants'
import { getSetSlotIcon } from '../utils'
import { HeroActionArc } from '../components/HeroActionArc'
import type { EquipmentSlotKey } from '../constants'

export function ZoneHero({
  character, detail, draft, goTo, onToggleOwned, isOwned, totalOverride, artifactSets, weapons, defaultWeapon, onSelectSlot
}: any) {
  const colors = ELEMENT_HEX[character.element as keyof typeof ELEMENT_HEX]
  const portraitSrc = detail?.custom_portrait_url ?? character.portrait_url ?? character.icon_url ?? ''
  const weaponPct = draft?.weapon_level ? Math.min(100, (draft.weapon_level / 90) * 100) : 0

  const selectedWeapon = weapons.find((w: any) => w.id === draft?.weapon_id)

  const items: RadialItem[] = [
    {
      key: 'weapon',
      label: 'Оружие',
      value: weaponPct,
      // Если оружие не выбрано, ставим картинку 1-звездочного
      icon: selectedWeapon?.icon_url || defaultWeapon?.icon_url || '⚔️',
      rawValue: draft?.weapon_level ?? 0,
      stars: draft?.weapon_refinement ?? 0
    },
    { key: 'flower', label: 'Цветок', value: 0, icon: PLACEHOLDER_ICONS.flower, rawValue: '' },
    { key: 'plume', label: 'Перо', value: 0, icon: PLACEHOLDER_ICONS.plume, rawValue: '' },
    { key: 'sands', label: 'Часы', value: 0, icon: PLACEHOLDER_ICONS.sands, rawValue: '' },
    { key: 'goblet', label: 'Кубок', value: 0, icon: PLACEHOLDER_ICONS.goblet, rawValue: '' },
    { key: 'circlet', label: 'Шапка', value: 0, icon: PLACEHOLDER_ICONS.circlet, rawValue: '' },
  ]

  if (detail) {
    const slotOrder: Record<string, number> = { flower: 1, plume: 2, sands: 3, goblet: 4, circlet: 5 }
    for (const a of detail.artifacts) {
      const idx = slotOrder[a.slot]
      if (idx != null) {
        const maxLevel = ARTIFACT_MAX_LEVEL[a.rarity] ?? 20
        items[idx].value = Math.round((a.level / maxLevel) * 100)
        items[idx].rawValue = String(a.level)

        const set = artifactSets.find((s: any) => s.id === a.set_id)
        if (set) {
          const icon = getSetSlotIcon(set, a.slot)
          if (icon) items[idx].icon = icon
        }
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
    { icon: '💥', label: 'Взрыв стихии', value: draft?.talent_burst ?? 1, ringPercent: Math.min(100, ((draft?.talent_burst ?? 1) / 9) * 100), crownAt: 10 },
    { icon: '⚡', label: 'Элем. навык', value: draft?.talent_skill ?? 1, ringPercent: Math.min(100, ((draft?.talent_skill ?? 1) / 9) * 100), crownAt: 10 },
    { icon: '⚔️', label: 'Обычная атака', value: draft?.talent_normal ?? 1, ringPercent: Math.min(100, ((draft?.talent_normal ?? 1) / 9) * 100), crownAt: 10 },
    { hidden: true },
    { variant: 'plain', icon: isOwned ? '👤' : '➕', label: isOwned ? 'Убрать из трекера' : 'Добавить в трекер', angle: 180 },
    { icon: '📊', label: 'Уровень', value: draft?.level ?? 1, ringPercent: Math.min(100, ((draft?.level ?? 1) / 90) * 100), crownAt: 91 },
    { icon: '💚', label: 'Дружба', value: draft?.friendship ?? 1, ringPercent: Math.min(100, ((draft?.friendship ?? 1) / 10) * 100) },
  ]

  function handleOuterClick(i: number) {
    if (i >= 1 && i <= 6) goTo(3)
    else if (i >= 7 && i <= 9) goTo(1)
    else if (i === 10) onToggleOwned()
    else if (i === 12 || i === 13) goTo(1)
  }

  return (
    <section className="h-screen relative overflow-hidden" style={{ background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)` }}>
      <div className="h-full w-full flex items-center justify-center gap-6 md:gap-12 lg:gap-24 px-6 pt-4 pb-20">
        <div className="relative shrink-0 rounded-2xl overflow-hidden" style={{ aspectRatio: '3 / 4', height: 'min(84vh, 780px)', maxWidth: '42vw', boxShadow: `0 0 55px ${colors.main}99` }}>
          {portraitSrc && <img src={portraitSrc} alt={character.name} className="absolute inset-0 w-full h-full object-cover object-center" />}
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
            if (key === 'total') return
            if (key === 'weapon') { onSelectSlot('weapon'); return }
            onSelectSlot(key as EquipmentSlotKey)
          }}
          hideCenter
        />
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center max-w-[70vw]">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,1)]" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>{character.name_ru || character.name}</h1>
        {character.title && <p className="text-slate-300 mt-0.5 text-sm md:text-base drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">{character.title}</p>}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-400 text-xs animate-pulse pointer-events-none">Прокрути колёсиком или свайпни ↓</div>
    </section>
  )
}
