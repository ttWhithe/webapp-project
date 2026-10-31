import { useState } from 'react'
import { ELEMENT_HEX, TALENT_COLORS } from '@/shared/lib/catalog-meta'
import RadialProgress, { type OuterSlotConfig, type RadialItem } from '@/shared/ui/RadialProgress'
import { ARTIFACT_MAX_LEVEL } from '../constants'
import { getSetSlotIcon } from '../utils'
import { HeroActionArc } from '../components/HeroActionArc'
import { CharacterToggleButton } from '../components/CharacterToggleButton'
import type { EquipmentSlotKey } from '../constants'

export function ZoneHero({
  character, detail, draft, goTo, onToggleOwned, isOwned, totalOverride, artifactSets, weapons, defaultWeapon, onSelectSlot
}: any) {
  const [isFullPortrait, setIsFullPortrait] = useState(false)
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
    { key: 'flower', label: 'Цветок', value: 0, icon: '', rawValue: '', disabled: isUnowned, grayscale: isUnowned, isArtifact: true },
    { key: 'plume', label: 'Перо', value: 0, icon: '', rawValue: '', disabled: isUnowned, grayscale: isUnowned, isArtifact: true },
    { key: 'sands', label: 'Часы', value: 0, icon: '', rawValue: '', disabled: isUnowned, grayscale: isUnowned, isArtifact: true },
    { key: 'goblet', label: 'Кубок', value: 0, icon: '', rawValue: '', disabled: isUnowned, grayscale: isUnowned, isArtifact: true },
    { key: 'circlet', label: 'Шапка', value: 0, icon: '', rawValue: '', disabled: isUnowned, grayscale: isUnowned, isArtifact: true },
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
      disabled: isUnowned,
      opacity: isUnowned ? 0.3 : (cLevel >= level ? 1 : 0.4),
      grayscale: isUnowned || cLevel < level,
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
      disabled: isUnowned, grayscale: isUnowned, hideValue: isUnowned,
    },
    {
      icon: character.talents?.['Elemental Skill']?.icon || '⚡',
      label: 'Элем. навык', value: isUnowned ? 0 : effSkill,
      ringPercent: isUnowned ? 0 : Math.min(100, (effSkill / (isSkillBuffed ? 12 : 9)) * 100),
      goldenAt: skillCrownAt,
      textColor: isUnowned ? undefined : (effSkill >= skillCrownAt ? TALENT_COLORS.crown.accent : (isSkillBuffed ? TALENT_COLORS.constellation.accent : undefined)),
      disabled: isUnowned, grayscale: isUnowned, hideValue: isUnowned,
    },
    {
      icon: character.talents?.['Normal Attack']?.icon || '⚔️',
      label: 'Обычная атака', value: isUnowned ? 0 : effNormal,
      ringPercent: isUnowned ? 0 : Math.min(100, (effNormal / (isNormalBuffed ? 12 : 9)) * 100),
      goldenAt: normalCrownAt,
      textColor: isUnowned ? undefined : (effNormal >= normalCrownAt ? TALENT_COLORS.crown.accent : (isNormalBuffed ? TALENT_COLORS.constellation.accent : undefined)),
      disabled: isUnowned, grayscale: isUnowned, hideValue: isUnowned,
    },
    { hidden: true },
    {
      variant: 'plain', label: isOwned ? 'Убрать из трекера' : 'Добавить в трекер', angle: 180,
      customRender: <CharacterToggleButton isOwned={isOwned} onClick={onToggleOwned} colors={colors} element={character.element} />
    },
    {
      icon: '/icons/ui/exp.png', label: 'Уровень', value: isUnowned ? 0 : (draft?.level ?? 1),
      ringPercent: isUnowned ? 0 : Math.min(100, ((draft?.level ?? 1) / 90) * 100),
      goldenAt: 91, disabled: isUnowned, grayscale: isUnowned, hideValue: isUnowned,
      badge: (!isUnowned && (draft?.level ?? 1) > 90) ? (
        <div className="flex items-center gap-0.5 ml-0.5 -translate-y-[2px]">
          <img src="/icons/ui/stella_fortuna.png" className="w-[1.1em] h-[1.1em] object-contain drop-shadow-md" alt="Stella" />
          <span className="text-purple-500 font-bold">{(draft?.level ?? 1) <= 95 ? 1 : 3}</span>
        </div>
      ) : undefined
    },
    {
      icon: '/icons/ui/friendship.svg', label: 'Дружба', value: isUnowned ? 0 : (draft?.friendship ?? 1),
      ringPercent: isUnowned ? 0 : Math.min(100, ((draft?.friendship ?? 1) / 10) * 100),
      disabled: isUnowned, grayscale: isUnowned, hideValue: isUnowned,
    },
  ]

  function handleOuterClick(i: number) {
    if (isUnowned && i !== 10) return
    if (i >= 1 && i <= 6) goTo(3)
    else if (i >= 7 && i <= 9) goTo(1)
    else if (i === 10) onToggleOwned()
    else if (i === 12 || i === 13) goTo(1)
  }

  // --- ПАССИВКИ ---
  let talentsObj: any = character.talents || {}
  if (typeof talentsObj === 'string') {
    try { talentsObj = JSON.parse(talentsObj) } catch (e) { talentsObj = {} }
  }
  const standardKeys = ['Normal Attack', 'Elemental Skill', 'Elemental Burst', '1st Ascension Passive', '4th Ascension Passive', 'Utility Passive']
  const uniqueKey = Object.keys(talentsObj).find(k => !standardKeys.includes(k))

  const charLevel = draft?.level ?? 1

  const passives = [
    { data: talentsObj['1st Ascension Passive'], reqLevel: 20 },
    { data: talentsObj['4th Ascension Passive'], reqLevel: 60 },
    { data: uniqueKey ? talentsObj[uniqueKey] : null, reqLevel: 1 },
    { data: talentsObj['Utility Passive'], reqLevel: 1 },
  ]
    .filter(p => p.data && p.data.icon)
    .map(p => ({
      ...p.data,
      isUnlocked: isUnowned ? false : charLevel >= p.reqLevel,
      reqLevel: p.reqLevel
    }))

  return (
    <section className="h-full relative overflow-hidden" style={{ background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, transparent 70%)` }}>
      <div className="h-full w-full flex items-center justify-center gap-6 md:gap-12 lg:gap-24 px-6 pt-4 pb-20">

        {/* ОБЕРТКА ПОРТРЕТА И ПАССИВОК */}
        <div className="relative shrink-0" style={{ height: 'min(84vh, 780px)', maxWidth: '42vw', aspectRatio: '3 / 4' }}>

          <div
            className="w-full h-full relative bg-transparent transition-all duration-700 ease-in-out"
            style={{
              boxShadow: isFullPortrait ? '0 0 0 transparent, 0 0 0 transparent, inset 0 0 0 transparent' : `0 0 80px ${colors.main}66, 0 20px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.7)`,
              clipPath: isFullPortrait ? 'none' : 'inset(0 round 16px)',
              border: isFullPortrait ? '1px solid transparent' : `1px solid ${colors.secondary}40`,
              zIndex: isFullPortrait ? 0 : 10
            }}
          >
            {portraitSrc && (
              <>
                {/* Обрезанная версия (плавно исчезает) */}
                <img
                  src={portraitSrc}
                  alt={character.name}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                    isUnowned ? 'grayscale' : ''
                  } ${isFullPortrait ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                />
                {/* Полная версия (плавно появляется и вылезает за края) */}
                <img
                  src={portraitSrc}
                  alt={character.name}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none object-contain transition-opacity duration-700 ease-in-out ${
                    isUnowned ? 'grayscale' : ''
                  } ${isFullPortrait ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                />
              </>
            )}           {/* {!isFullPortrait && <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />}*/}
            <HeroActionArc colors={colors} isUnowned={isUnowned} />
          </div>

          {/* Кнопка переключения режима портрета (Стихийная) */}
          <button
            onClick={() => setIsFullPortrait(!isFullPortrait)}
            className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg hover:scale-110 cursor-pointer transition-transform"
            style={{
              backgroundColor: `${colors.main}cc`,
              borderColor: colors.secondary,
              color: colors.secondary,
              boxShadow: `0 0 14px ${colors.main}`,
            }}
            title={isFullPortrait ? "Скрыть края" : "Показать персонажа полностью"}
          >
            {isFullPortrait ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            )}
          </button>

          <div className="absolute bottom-4 right-4 flex gap-3 z-30">
            {passives.map((p, idx) => (
              <div key={idx} className="group relative w-12 h-12 rounded-full cursor-pointer">
                <div
                  className="absolute inset-0 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg"
                  style={{
                    borderColor: p.isUnlocked ? colors.secondary : '#475569',
                    backgroundColor: p.isUnlocked ? `${colors.main}cc` : '#1e293b',
                    boxShadow: p.isUnlocked ? `0 0 10px ${colors.main}` : 'none',
                    opacity: p.isUnlocked ? 1 : 0.5,
                  }}
                >
                  <img
                    src={p.icon}
                    alt={p.name}
                    className={`w-full h-full object-cover rounded-full p-0.5 ${!p.isUnlocked ? 'grayscale' : ''}`}
                  />
                </div>

                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 rounded-xl bg-slate-800/95 border border-slate-600 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50">
                  <p className={`text-xs font-bold leading-tight ${p.isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                    {p.name}
                  </p>
                  {/* Показываем требование, ТОЛЬКО если персонаж есть в трекере и уровень пассивки > 1 */}
                  {!p.isUnlocked && !isUnowned && p.reqLevel > 1 && (
                    <p className="text-[10px] text-red-400 mt-1">Требуется уровень {p.reqLevel}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ОБЕРНУЛИ В DIV С Z-20 */}
        <div className="relative z-20 flex items-center justify-center">
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
            isUnowned={isUnowned}
            hideCenter
          />
        </div>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center max-w-[70vw]">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,1)]" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>{character.name_ru || character.name}</h1>
        {character.title && <p className="text-slate-300 mt-0.5 text-sm md:text-base drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">{character.title}</p>}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-400 text-xs animate-pulse pointer-events-none">Прокрути колёсиком или свайпни ↓</div>
    </section>
  )
}
