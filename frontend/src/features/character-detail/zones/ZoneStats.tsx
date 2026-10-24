import { ELEMENT_HEX } from '@/shared/lib/catalog-meta'
import { PROGRESS_LEVEL_CAP } from '@/shared/lib/progress'
import CircularProgress from '@/shared/ui/CircularProgress'
import ProgressSlider from '@/shared/ui/ProgressSlider'
import StatInput from '@/shared/ui/StatInput'
import { Link } from 'react-router-dom'

export function ZoneStats({ character, detail, draft, progress, onUpdate, isSaving, lastSaved, goTo }: any) {
  const colors = ELEMENT_HEX[character.element as keyof typeof ELEMENT_HEX]
  if (!detail || !draft || !progress) return (
    <section className="h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Характеристики</h2>
        <p className="text-slate-400 mb-6">Этот персонаж пока не в вашем трекере.</p>
        <Link to="/me/characters" className="inline-block px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 font-medium">Перейти в трекер</Link>
      </div>
    </section>
  )

  return (
    <section className="h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)` }}>
      <div className="w-full max-w-[1800px] grid grid-cols-1 lg:grid-cols-[320px_1fr_500px] gap-6 px-6">
        <div className="flex flex-col gap-4 -translate-y-[40px]">
          <div className="text-center"><h2 className="text-2xl font-bold">{character.name_ru || character.name}</h2><p className="text-sm text-slate-400">Характеристики</p></div>
          {character.icon_url && <div className="mx-[10px] rounded-xl overflow-hidden" style={{ border: `2px solid ${colors.secondary}`, boxShadow: `0 0 28px ${colors.main}66`, aspectRatio: '1 / 1' }}><img src={character.icon_url} alt={character.name} className="w-full h-full object-cover" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <StatInput label="HP" value={draft.custom_hp} onChange={(v: any) => onUpdate('custom_hp', v)} colors={colors} min={0} />
            <StatInput label="ATK" value={draft.custom_atk} onChange={(v: any) => onUpdate('custom_atk', v)} colors={colors} min={0} />
            <StatInput label="DEF" value={draft.custom_def} onChange={(v: any) => onUpdate('custom_def', v)} colors={colors} min={0} />
            <StatInput label="EM" value={draft.custom_em} onChange={(v: any) => onUpdate('custom_em', v)} colors={colors} min={0} />
            <StatInput label="CRIT Rate" value={draft.custom_crit_rate} onChange={(v: any) => onUpdate('custom_crit_rate', v)} suffix="%" colors={colors} min={0} max={200} step={0.1} />
            <StatInput label="CRIT DMG" value={draft.custom_crit_dmg} onChange={(v: any) => onUpdate('custom_crit_dmg', v)} suffix="%" colors={colors} min={0} max={500} step={0.1} />
            <StatInput label="Energy Recharge" value={draft.custom_energy_recharge} onChange={(v: any) => onUpdate('custom_energy_recharge', v)} suffix="%" colors={colors} min={0} max={500} step={0.1} />
            <StatInput label="Elem. DMG Bonus" value={draft.custom_elemental_dmg_bonus} onChange={(v: any) => onUpdate('custom_elemental_dmg_bonus', v)} suffix="%" colors={colors} min={0} max={500} step={0.1} />
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 px-[50px]">
          <ProgressSlider label="Уровень персонажа" value={draft.level} min={1} max={draft.level_cap} onChange={(v: any) => onUpdate('level', v)} icon="📊" colors={colors} crownAt={PROGRESS_LEVEL_CAP + 1} ringCap={PROGRESS_LEVEL_CAP} />
          <ProgressSlider label="Уровень дружбы" value={draft.friendship} min={1} max={10} onChange={(v: any) => onUpdate('friendship', v)} icon="💚" colors={colors} ringCap={10} />
          <div className="flex items-center gap-3 my-2"><div className="flex-1 h-[2px] rounded-full" style={{ backgroundColor: colors.secondary }} /><span className="text-xs uppercase tracking-widest font-semibold" style={{ color: colors.accent }}>Таланты</span><div className="flex-1 h-[2px] rounded-full" style={{ backgroundColor: colors.secondary }} /></div>
          <ProgressSlider label="Обычная атака" value={draft.talent_normal} min={1} max={10} onChange={(v: any) => onUpdate('talent_normal', v)} icon="⚔️" colors={colors} crownAt={10} ringCap={9} />
          <ProgressSlider label="Элементарный навык" value={draft.talent_skill} min={1} max={10} onChange={(v: any) => onUpdate('talent_skill', v)} icon="⚡" colors={colors} crownAt={10} ringCap={9} />
          <ProgressSlider label="Взрыв стихии" value={draft.talent_burst} min={1} max={10} onChange={(v: any) => onUpdate('talent_burst', v)} icon="💥" colors={colors} crownAt={10} ringCap={9} />
        </div>
        <div className="hidden lg:flex items-center justify-center">
          <button type="button" onClick={() => goTo(0)} title="Вернуться к персонажу" className="relative transition-transform duration-300 hover:scale-105 cursor-pointer" style={{ width: 400, height: 400, background: 'transparent', border: 'none', padding: 0 }}>
            <CircularProgress value={progress.total} size={400} strokeWidth={26} fillColor={colors.secondary} emptyColor={colors.main} innerColor={colors.main} borderColor={colors.secondary} textColor={colors.secondary} textStroke={colors.accent} borderWidth={6} />
          </button>
        </div>
      </div>
      <div className="absolute top-6 right-6 text-xs text-slate-400 flex items-center gap-2">{isSaving ? <span className="text-yellow-400">● Сохранение...</span> : lastSaved ? <span className="text-green-400">✓ Сохранено {lastSaved.toLocaleTimeString().slice(0, 5)}</span> : null}</div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-400 text-xs animate-pulse pointer-events-none">Прокрути колёсиком или свайпни ↓</div>
    </section>
  )
}
