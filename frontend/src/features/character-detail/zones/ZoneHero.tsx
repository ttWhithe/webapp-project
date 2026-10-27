import { ELEMENT_HEX, TALENT_COLORS } from '@/shared/lib/catalog-meta'
import RadialProgress, { type OuterSlotConfig, type RadialItem } from '@/shared/ui/RadialProgress'
import { ARTIFACT_MAX_LEVEL, PLACEHOLDER_ICONS } from '../constants'
import { getSetSlotIcon } from '../utils'
import { HeroActionArc } from '../components/HeroActionArc'
import { CharacterToggleButton } from '../components/CharacterToggleButton'
import type { EquipmentSlotKey } from '../constants'

export function ZoneHero({
  character, detail, draft, goTo, onToggleOwned, isOwned, totalOverride, artifactSets, weapons, defaultWeapon, onSelectSlot
}: any) {
  const colors = ELEMENT_HEX[character.element as keyof typeof ELEMENT_HEX]
  const portraitSrc = detail?.custom_portrait_url ?? character.portrait_url ?? character.icon_url ?? ''

  const isUnowned = !isOwned;

  const weaponPct = (isUnowned || !draft?.weapon_level) ? 0 : Math.min(100, (draft.weapon_level / 90) * 100)
  const selectedWeapon = weapons.find((w: any) => w.id === draft?.weapon_id)

  const items: RadialItem[] = [
    {
      key: 'weapon', label: 'Оружие', value: weaponPct,
      icon: selectedWeapon?.icon_url || defaultWeapon?.icon_url || '⚔️',
      rawValue: isUnowned ? '' : (draft?.weapon_level ?? 1),
      stars: isUnowned ? undefined : (draft?.weapon_refinement ?? 1),
      disabled: isUnowned,
      grayscale: isUnowned,
      hideValue: isUnowned,
    },
    { key: 'flower', label: 'Цветок', value: 0, icon: PLACEHOLDER_ICONS.flower, rawValue: '', disabled: isUnowned, grayscale: isUnowned },
    { key: 'plume', label: 'Перо', value: 0, icon: PLACEHOLDER_ICONS.plume, rawValue: '', disabled: isUnowned, grayscale: isUnowned },
    { key: 'sands', label: 'Часы', value: 0, icon: PLACEHOLDER_ICONS.sands, rawValue: '', disabled: isUnowned, grayscale: isUnowned },
    { key: 'goblet', label: 'Кубок', value: 0, icon: PLACEHOLDER_ICONS.goblet, rawValue: '', disabled: isUnowned, grayscale: isUnowned },
    { key: 'circlet', label: 'Шапка', value: 0, icon: PLACEHOLDER_ICONS.circlet, rawValue: '', disabled: isUnowned, grayscale: isUnowned },
  ]

  if (!isUnowned && detail) {
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

  const total = isUnowned ? 0 : (totalOverride ?? detail?.progress.total ?? 0)

  let consts: any = character.constellations || {}
  if (typeof consts === 'string') {
    try { consts = JSON.parse(consts) } catch (e) { consts = {} }
  }
  const cLevel = draft?.constellation || 0
  const c3Inc = character.c3_increases || consts['3']?.increases || ''
  const c5Inc = character.c5_increases || consts['5']?.increases || ''

  const isNormalBuffed = !isUnowned && ((cLevel >= 3 && c3Inc.includes('Normal')) || (cLevel >= 5 && c5Inc.includes('Normal')))
  const isSkillBuffed = !isUnowned && ((cLevel >= 3 && c3Inc.includes('Skill')) || (cLevel >= 5 && c5Inc.includes('Skill')))
  const isBurstBuffed = !isUnowned && ((cLevel >= 3 && c3Inc.includes('Burst')) || (cLevel >= 5 && c5Inc.includes('Burst')))

  const baseNormal = draft?.talent_normal ?? 1
  const baseSkill = draft?.talent_skill ?? 1
  const baseBurst = draft?.talent_burst ?? 1

  const effNormal = isUnowned ? 0 : (isNormalBuffed ? baseNormal + 3 : baseNormal)
  const effSkill = isUnowned ? 0 : (isSkillBuffed ? baseSkill + 3 : baseSkill)
  const effBurst = isUnowned ? 0 : (isBurstBuffed ? baseBurst + 3 : baseBurst)

  const normalCrownAt = isNormalBuffed ? 13 : 10
  const skillCrownAt = isSkillBuffed ? 13 : 10
  const burstCrownAt = isBurstBuffed ? 13 : 10

  const outerConsts: OuterSlotConfig[] = Array.from({ length: 6 }, (_, i) => {
    const level = i + 1
    const data = consts[String(level)] || {}

    return {
      variant: 'plain',
      icon: data.icon || character.constellation_icon_url || '🌟',
      label: data.name || `Созвездие ${level}`,
      disabled: isUnowned, // <--- БЛОКИРУЕМ ТОЛЬКО ЕСЛИ ПЕРСОНАЖА НЕТ
      opacity: isUnowned ? 0.3 : (cLevel >= level ? 1 : 0.4),
      grayscale: isUnowned || cLevel < level, // Остается серым, если созвездие не открыто
    }
  })

  const OUTER_CONFIG: OuterSlotConfig[] = [
    { hidden: true },
    ...outerConsts,
    {
      icon: character.talents?.['Elemental Burst']?.icon || '💥',
      label: 'Взрыв стихии', value: isUnowned ? 0 : effBurst,
      ringPercent: isUnowned ? 0 : Math.min(100, (effBurst / (isBurstBuffed ? 12 : 9)) * 100),
      goldenAt: burstCrownAt,
      textColor: isUnowned ? undefined : (effBurst >= burstCrownAt ? TALENT_COLORS.crown.accent : (isBurstBuffed ? TALENT_COLORS.constellation.accent : undefined)),
      disabled: isUnowned,
      grayscale: isUnowned,
      hideValue: isUnowned,
    },
    {
      icon: character.talents?.['Elemental Skill']?.icon || '⚡',
      label: 'Элем. навык', value: isUnowned ? 0 : effSkill,
      ringPercent: isUnowned ? 0 : Math.min(100, (effSkill / (isSkillBuffed ? 12 : 9)) * 100),
      goldenAt: skillCrownAt,
      textColor: isUnowned ? undefined : (effSkill >= skillCrownAt ? TALENT_COLORS.crown.accent : (isSkillBuffed ? TALENT_COLORS.constellation.accent : undefined)),
      disabled: isUnowned,
      grayscale: isUnowned,
      hideValue: isUnowned,
    },
    {
      icon: character.talents?.['Normal Attack']?.icon || '⚔️',
      label: 'Обычная атака', value: isUnowned ? 0 : effNormal,
      ringPercent: isUnowned ? 0 : Math.min(100, (effNormal / (isNormalBuffed ? 12 : 9)) * 100),
      goldenAt: normalCrownAt,
      textColor: isUnowned ? undefined : (effNormal >= normalCrownAt ? TALENT_COLORS.crown.accent : (isNormalBuffed ? TALENT_COLORS.constellation.accent : undefined)),
      disabled: isUnowned,
      grayscale: isUnowned,
      hideValue: isUnowned,
    },
    { hidden: true },
    {
      variant: 'plain',
      label: isOwned ? 'Убрать из трекера' : 'Добавить в трекер',
      angle: 180,
      customRender: <CharacterToggleButton isOwned={isOwned} onClick={onToggleOwned} colors={colors} />
    },
    {
      icon: '📊', label: 'Уровень', value: isUnowned ? 0 : (draft?.level ?? 1),
      ringPercent: isUnowned ? 0 : Math.min(100, ((draft?.level ?? 1) / 90) * 100),
      goldenAt: 91,
      disabled: isUnowned,
      grayscale: isUnowned,
      hideValue: isUnowned,
    },
    {
      icon: '💚', label: 'Дружба', value: isUnowned ? 0 : (draft?.friendship ?? 1),
      ringPercent: isUnowned ? 0 : Math.min(100, ((draft?.friendship ?? 1) / 10) * 100),
      disabled: isUnowned,
      grayscale: isUnowned,
      hideValue: isUnowned,
    },
  ]

  function handleOuterClick(i: number) {
    if (isUnowned && i !== 10) return

    if (i >= 1 && i <= 6) goTo(3)
    else if (i >= 7 && i <= 9) goTo(1)
    else if (i === 10) onToggleOwned()
    else if (i === 12 || i === 13) goTo(1)
  }

  return (
    <section className="h-screen relative overflow-hidden" style={{ background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)` }}>
      <div className="h-full w-full flex items-center justify-center gap-6 md:gap-12 lg:gap-24 px-6 pt-4 pb-20">
        {/* Убрали grayscale у контейнера с портретом */}
        <div className="relative shrink-0 rounded-2xl overflow-hidden transition-all duration-500" style={{ aspectRatio: '3 / 4', height: 'min(84vh, 780px)', maxWidth: '42vw', boxShadow: `0 0 55px ${colors.main}99` }}>
          {portraitSrc && <img src={portraitSrc} alt={character.name} className="absolute inset-0 w-full h-full object-cover object-center" />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />
          <HeroActionArc colors={colors} isUnowned={isUnowned} />
        </div>

        <RadialProgress
          total={total}
          items={items}
          colors={colors}
          size={Math.min(620, Math.round(window.innerHeight))}
          outerSlotsConfig={OUTER_CONFIG}
          onOuterClick={handleOuterClick}
          onMiddleClick={(key) => {
            if (isUnowned) return
            if (key === 'total') return
            if (key === 'weapon') { onSelectSlot('weapon'); return }
            onSelectSlot(key as EquipmentSlotKey)
          }}
          isUnowned={isUnowned} // <--- ПЕРЕДАЕМ ФЛАГ
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
