import { ELEMENT_HEX } from '@/shared/lib/catalog-meta'
import CircularProgress from '@/shared/ui/CircularProgress'
import EquipmentSlotButton from '@/shared/ui/EquipmentSlotButton'
import { ARTIFACT_MAX_LEVEL, EQUIPMENT_SLOTS, MAIN_STATS, PLACEHOLDER_ICONS, SUB_STATS } from '../constants'
import { getSetSlotIcon } from '../utils'
import { RefinementArc } from '../components/RefinementArc'
import { RarityArc } from '../components/RarityArc'
import { SimpleSlider } from '../components/SimpleSlider'
import type { UserArtifactRead } from '@/shared/api/types'

export function ZoneWeaponArtifacts({
  character,
  detail,
  draft,
  progress,
  onUpdate,
  goTo,
  isSaving,
  lastSaved,
  artifactSets,
  weapons,
  defaultWeapon,
  weaponsQuery,
  selectedSlot,
  setSelectedSlot
}: any) {
  const colors = ELEMENT_HEX[character.element as keyof typeof ELEMENT_HEX]

  if (!detail || !draft || !progress) return <section className="h-screen flex items-center justify-center text-slate-500">Нет данных об экипировке</section>

  const refinement = draft.weapon_refinement ?? 1
  const weaponPct = draft.weapon_level ? Math.min(100, (draft.weapon_level / 90) * 100) : 0
  const selectedMeta = EQUIPMENT_SLOTS.find((s) => s.key === selectedSlot)!

  const currentArtifact = draft.artifacts.find((a: UserArtifactRead) => a.slot === selectedSlot)
  const currentSetInfo = artifactSets.find((s: any) => s.id === currentArtifact?.set_id)
  const isPlaceholder = selectedSlot !== 'weapon' && !currentArtifact
  const artifactIcon = (!isPlaceholder && currentSetInfo) ? getSetSlotIcon(currentSetInfo, selectedSlot) : null

  // Если оружие не выбрано, используем 1-звездочную заглушку
  const selectedWeapon = draft.weapon_id ? weapons.find((w: any) => w.id === draft.weapon_id) : defaultWeapon
  const displayWeaponIcon = selectedWeapon?.icon_url

  function handleArtifactUpdate(updates: Partial<UserArtifactRead> | null) {
    let newArtifacts = [...draft.artifacts]
    const idx = newArtifacts.findIndex((a: UserArtifactRead) => a.slot === selectedSlot)

    if (updates === null) {
      newArtifacts = newArtifacts.filter((a: UserArtifactRead) => a.slot !== selectedSlot)
      onUpdate('artifacts', newArtifacts)
      return
    }

    let finalLevel = updates.level !== undefined ? updates.level : (idx >= 0 ? Math.max(1, newArtifacts[idx].level) : 1)
    const finalRarity = updates.rarity !== undefined ? updates.rarity : (idx >= 0 ? newArtifacts[idx].rarity : 5)
    const maxLevel = ARTIFACT_MAX_LEVEL[finalRarity] || 20

    if (finalLevel > maxLevel) finalLevel = maxLevel
    if (finalLevel < 1) finalLevel = 1

    if (idx >= 0) {
      newArtifacts[idx] = { ...newArtifacts[idx], ...updates, level: finalLevel }
    } else {
      newArtifacts.push({
        id: Math.random().toString(), slot: selectedSlot,
        set_id: updates.set_id || '', set_slug: updates.set_slug || '', set_name: updates.set_name || '',
        rarity: finalRarity, level: finalLevel,
        main_stat: updates.main_stat || null, substats: updates.substats || [],
      })
    }
    onUpdate('artifacts', newArtifacts)
  }

  const setCounts: Record<string, number> = {}
  draft.artifacts.forEach((a: UserArtifactRead) => {
    if (a.set_id && a.set_id !== 'none') {
      setCounts[a.set_id] = (setCounts[a.set_id] || 0) + 1
    }
  })
  const activeBonuses: { set: string, text: string }[] = []
  for (const [setId, count] of Object.entries(setCounts)) {
    const setInfo = artifactSets.find((s: any) => s.id === setId)
    if (setInfo) {
      if (count >= 2 && setInfo.bonus_2pc) activeBonuses.push({ set: setInfo.name, text: `2pc: ${setInfo.bonus_2pc}` })
      if (count >= 4 && setInfo.bonus_4pc) activeBonuses.push({ set: setInfo.name, text: `4pc: ${setInfo.bonus_4pc}` })
    }
  }

  return (
    <section className="h-screen relative overflow-hidden" style={{ background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)` }}>
      <div className="h-full w-full max-w-[1800px] mx-auto px-6 py-6 flex flex-col gap-5">

        {/* Header row */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 shrink-0">
            {character.icon_url && <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ border: `2px solid ${colors.secondary}`, boxShadow: `0 0 20px ${colors.main}66` }}><img src={character.icon_url} alt={character.name} className="w-full h-full object-cover" /></div>}
            <div><h2 className="text-2xl font-bold whitespace-nowrap" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>{character.name_ru || character.name}</h2><p className="text-sm text-slate-400">Экипировка</p></div>
          </div>

          <div className="flex items-center gap-2">
            {/* Кнопка ОРУЖИЯ в верхнем меню (исправлено) */}
            <EquipmentSlotButton
              icon={EQUIPMENT_SLOTS[0].icon}
              customIconUrl={displayWeaponIcon}
              label={EQUIPMENT_SLOTS[0].label}
              selected={selectedSlot === 'weapon'}
              filled={!!draft.weapon_id || !!defaultWeapon}
              progress={weaponPct}
              levelText={draft.weapon_level != null ? String(draft.weapon_level) : undefined}
              stars={refinement}
              colors={colors}
              onClick={() => setSelectedSlot('weapon')}
            />
            <div className="h-16 w-[3px] rounded-full" style={{ backgroundColor: colors.secondary }} />

            {EQUIPMENT_SLOTS.slice(1).map((slot) => {
              const a = draft.artifacts.find((x: UserArtifactRead) => x.slot === slot.key)
              const set = artifactSets.find((s: any) => s.id === a?.set_id)
              const isNone = !a || a.set_id === 'none'

              const iconUrl = (!isNone && set) ? getSetSlotIcon(set, slot.key) : PLACEHOLDER_ICONS[slot.key]
              const pct = a && !isNone ? (a.level / (ARTIFACT_MAX_LEVEL[a.rarity] || 20)) * 100 : 0
              const lvlText = a && !isNone ? String(Math.max(1, a.level)) : undefined

              return (
                <EquipmentSlotButton key={slot.key} icon={slot.icon} customIconUrl={iconUrl} label={slot.label} selected={selectedSlot === slot.key} filled={!isNone} progress={pct} levelText={lvlText} colors={colors} onClick={() => setSelectedSlot(slot.key)} />
              )
            })}

            <div className="h-16 w-[3px] rounded-full" style={{ backgroundColor: colors.secondary }} />

            <button type="button" onClick={() => goTo(0)} title="Вернуться к персонажу" className="relative shrink-0 rounded-full transition-transform duration-200 hover:scale-110 cursor-pointer" style={{ width: 128, height: 128 }}>
              <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${colors.secondary} 0deg ${Math.min(100, progress.total) * 3.6}deg, ${colors.main} ${Math.min(100, progress.total) * 3.6}deg 360deg)`, border: `5px solid ${colors.secondary}`, boxSizing: 'border-box', boxShadow: `0 0 26px ${colors.accent}66, 0 0 12px ${colors.main}` }} />
              <div className="absolute rounded-full flex items-center justify-center" style={{ top: '18%', left: '18%', right: '18%', bottom: '18%', backgroundColor: colors.main, border: `3px solid ${colors.secondary}`, boxSizing: 'border-box' }}>
                <span className="font-bold leading-none" style={{ color: colors.accent, fontFamily: "'Comic Sans MS', 'Comic Sans', cursive", fontSize: 26, textShadow: `0 0 4px ${colors.secondary}` }}>{Math.round(progress.total)}%</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-4 shrink-0 justify-end min-w-[300px]">
            {activeBonuses.length > 0 && (
              <div className="bg-indigo-950/60 p-2 rounded-xl border border-indigo-700/50 flex flex-col gap-1 max-w-[250px] shadow-lg">
                <h3 className="text-[10px] uppercase tracking-wider font-bold text-indigo-300">Активные бонусы:</h3>
                {activeBonuses.map((b, i) => (
                  <div key={i} className="text-[11px] text-slate-300 leading-tight">
                    <span className="font-semibold text-indigo-200">{b.set}</span> — {b.text}
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-slate-400 shrink-0 min-w-[100px] text-right">
              {isSaving ? <span className="text-yellow-400">● Сохранение...</span> : lastSaved ? <span className="text-green-400">✓ Сохранено {lastSaved.toLocaleTimeString().slice(0, 5)}</span> : null}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-0 grid grid-cols-[380px_1fr] gap-6">

          {/* LEFT: big circle, stats, set bonuses */}
          <div className="flex flex-col items-center gap-3 relative overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-700">
            <div className="relative flex items-center justify-center shrink-0" style={{ width: 340, height: 340 }}>
              <div className="relative" style={{ width: 240, height: 240 }}>
                <CircularProgress value={isPlaceholder ? 0 : (selectedSlot === 'weapon' ? weaponPct : (currentArtifact ? (currentArtifact.level / (ARTIFACT_MAX_LEVEL[currentArtifact.rarity] || 20)) * 100 : 0))} size={240} strokeWidth={24} fillColor={colors.secondary} emptyColor={colors.main} innerColor={colors.main} borderColor={colors.secondary} hideLabel borderWidth={5} />

                {/* Большой круг оружия (используем displayWeaponIcon для заглушки) */}
                {selectedSlot === 'weapon' && displayWeaponIcon ? (
                  <img src={displayWeaponIcon} alt="weapon" className="absolute rounded-full object-cover pointer-events-none" style={{ top: '18%', left: '18%', width: '64%', height: '64%' }} />
                ) : isPlaceholder ? (
                  <img src={PLACEHOLDER_ICONS[selectedSlot]} alt="placeholder" className="absolute rounded-full object-cover pointer-events-none opacity-50" style={{ top: '18%', left: '18%', width: '64%', height: '64%' }} />
                ) : artifactIcon ? (
                  <img src={artifactIcon} alt="artifact" className="absolute rounded-full object-cover pointer-events-none" style={{ top: '18%', left: '18%', width: '64%', height: '64%' }} />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ fontSize: 80, lineHeight: 1, paddingBottom: 30 }}>{selectedMeta.icon}</span>
                )}

                <div className="absolute left-1/2 -translate-x-1/2 flex items-start font-bold pointer-events-none" style={{ bottom: 10, color: colors.accent, fontFamily: "'Comic Sans MS', 'Comic Sans', cursive", fontSize: 36, textShadow: `0 0 5px ${colors.secondary}`, lineHeight: 1 }}>
                  {selectedSlot === 'weapon' ? <><span>{draft.weapon_level ?? 0}</span>{refinement > 0 && <span style={{ fontSize: '0.5em', color: '#fde047', marginLeft: 3, marginTop: -4 }}>★{refinement}</span>}</> : <span>{isPlaceholder ? '' : Math.max(1, currentArtifact?.level || 1)}</span>}
                </div>

                {selectedSlot === 'weapon' ? (
                  <RefinementArc value={refinement} colors={colors} size={240} onChange={(v) => onUpdate('weapon_refinement', v)} />
                ) : (
                  <RarityArc
                    value={isPlaceholder ? 0 : (currentArtifact?.rarity || 5)}
                    minRarity={isPlaceholder ? 0 : (currentSetInfo?.min_rarity || 1)}
                    maxRarity={isPlaceholder ? 0 : (currentSetInfo?.max_rarity || 5)}
                    colors={colors}
                    size={240}
                    onChange={(r) => !isPlaceholder && handleArtifactUpdate({ rarity: r })}
                  />
                )}
              </div>
            </div>

            {selectedSlot === 'weapon' ? (
              <div className="w-full shrink-0">
                <SimpleSlider label="Уровень оружия" value={draft.weapon_level ?? 1} min={1} max={90} onChange={(v) => onUpdate('weapon_level', v)} colors={colors} />
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3 shrink-0">
                <SimpleSlider
                  label={`Уровень артефакта`}
                  value={isPlaceholder ? 1 : Math.max(1, currentArtifact?.level || 1)}
                  min={1}
                  max={isPlaceholder ? 1 : (ARTIFACT_MAX_LEVEL[currentArtifact?.rarity || 5] || 20)}
                  onChange={(v) => !isPlaceholder && handleArtifactUpdate({ level: v })}
                  colors={colors}
                  disabled={isPlaceholder}
                />

                <div className={`bg-slate-900/60 p-3 rounded-xl border border-slate-700 flex flex-col gap-2 ${isPlaceholder ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="text-xs text-slate-400 font-semibold">Основная характеристика (Main Stat)</label>
                  <select value={currentArtifact?.main_stat || ''} onChange={(e) => handleArtifactUpdate({ main_stat: e.target.value })} className="bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white">
                    <option value="">— Не выбрано —</option>
                    {MAIN_STATS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className={`bg-slate-900/60 p-3 rounded-xl border border-slate-700 flex flex-col gap-2 ${isPlaceholder ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="text-xs text-slate-400 font-semibold">Доп. характеристики (Substats)</label>
                  {(currentArtifact?.substats || []).map((sub: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <select value={sub.stat} onChange={(e) => {
                        const newSubs = [...currentArtifact.substats]
                        newSubs[i].stat = e.target.value
                        handleArtifactUpdate({ substats: newSubs })
                      }} className="bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white flex-1">
                        {SUB_STATS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="text" value={sub.value} onChange={(e) => {
                        const newSubs = [...currentArtifact.substats]
                        newSubs[i].value = e.target.value
                        handleArtifactUpdate({ substats: newSubs })
                      }} className="bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white w-20" placeholder="+10%" />
                      <button onClick={() => {
                        const newSubs = currentArtifact.substats.filter((_: any, idx: number) => idx !== i)
                        handleArtifactUpdate({ substats: newSubs })
                      }} className="text-red-400 px-2 hover:bg-slate-800 rounded">✕</button>
                    </div>
                  ))}
                  {(currentArtifact?.substats?.length || 0) < 4 && (
                    <button onClick={() => {
                      const newSubs = [...(currentArtifact?.substats || []), { stat: 'HP', value: '' }]
                      handleArtifactUpdate({ substats: newSubs })
                    }} className="text-teal-400 text-xs text-left hover:underline mt-1">+ Добавить сабстат</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Grid of weapons or sets */}
          <div className="relative rounded-xl border border-slate-700 bg-slate-900/40 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-700 bg-slate-800/80">
               <h3 className="font-semibold text-slate-200">{selectedSlot === 'weapon' ? 'Выбор оружия' : 'Выбор сета артефактов'}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700">
              {selectedSlot === 'weapon' ? (
                weaponsQuery.isLoading ? <div className="text-center text-slate-500 py-10">Загрузка...</div> : (
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {weapons.map((w: any) => {
                      const isSelected = draft.weapon_id === w.id
                      return (
                        <button key={w.id} type="button" onClick={() => { onUpdate('weapon_id', w.id); if (draft.weapon_id !== w.id) { onUpdate('weapon_level', 1); onUpdate('weapon_refinement', 1); } }} title={w.name} className="relative aspect-square rounded-lg overflow-hidden transition-transform duration-200 cursor-pointer hover:scale-105 flex flex-col" style={{ border: `${isSelected ? 4 : 2}px solid ${isSelected ? colors.accent : colors.secondary}`, boxShadow: isSelected ? `0 0 20px ${colors.accent}88` : 'none', backgroundColor: colors.main }}>
                          {w.icon_url && <img src={w.icon_url} alt={w.name} loading="lazy" className="w-full h-full object-cover pb-6" />}
                          <div className="absolute top-1 right-1 px-1 rounded text-[10px] font-bold z-10" style={{ backgroundColor: colors.secondary, color: '#fde047' }}>★{w.rarity}</div>

                          <div className="absolute bottom-0 left-0 w-full bg-black/70 backdrop-blur-sm p-1">
                            <span className="text-[10px] text-white font-medium truncate block text-center w-full">{w.name}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <button
                    type="button"
                    onClick={() => handleArtifactUpdate(null)}
                    title="Убрать артефакт"
                    className="relative aspect-square rounded-lg overflow-hidden transition-transform duration-200 cursor-pointer hover:scale-105 flex flex-col"
                    style={{ border: `${isPlaceholder ? 4 : 2}px solid ${isPlaceholder ? colors.accent : colors.secondary}`, boxShadow: isPlaceholder ? `0 0 20px ${colors.accent}88` : 'none', backgroundColor: colors.main }}
                  >
                    <img src={PLACEHOLDER_ICONS[selectedSlot]} alt="Нет" loading="lazy" className="w-full h-full object-cover pb-8 opacity-60" />
                    <div className="absolute bottom-0 left-0 w-full bg-black/70 backdrop-blur-sm p-1.5">
                      <span className="text-[10px] text-white font-medium truncate block text-center w-full">— Нет —</span>
                    </div>
                  </button>

                  {artifactSets.map((s: any) => {
                    const isSelected = currentArtifact?.set_id === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleArtifactUpdate({ set_id: s.id, set_name: s.name, set_slug: s.slug, rarity: Math.min(Math.max(currentArtifact?.rarity || 5, s.min_rarity || 1), s.max_rarity || 5) })}
                        title={s.name}
                        className="relative aspect-square rounded-lg overflow-hidden transition-transform duration-200 cursor-pointer hover:scale-105 flex flex-col"
                        style={{ border: `${isSelected ? 4 : 2}px solid ${isSelected ? colors.accent : colors.secondary}`, boxShadow: isSelected ? `0 0 20px ${colors.accent}88` : 'none', backgroundColor: colors.main }}
                      >
                        {getSetSlotIcon(s, selectedSlot) ? (
                          <img src={getSetSlotIcon(s, selectedSlot)!} alt={s.name} loading="lazy" className="w-full h-full object-cover pb-8" />
                        ) : (
                          <div className="w-full h-full pb-8 flex items-center justify-center opacity-50 text-3xl">{selectedMeta.icon}</div>
                        )}

                        <div className="absolute bottom-0 left-0 w-full bg-black/70 backdrop-blur-sm p-1.5">
                          <span className="text-[10px] text-white font-medium truncate block text-center w-full">{s.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
