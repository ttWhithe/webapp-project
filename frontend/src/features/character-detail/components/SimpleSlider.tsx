export function SimpleSlider({ label, value, min, max, onChange, colors, disabled }: any) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  const bg = `linear-gradient(to right, ${colors.secondary} 0%, ${colors.secondary} ${pct}%, ${colors.accent} ${pct}%, ${colors.accent} 100%)`
  return (
    <div className={`flex flex-col gap-2 px-4 py-3 rounded-2xl transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`} style={{ backgroundColor: colors.main, border: `3px solid ${colors.secondary}`, boxShadow: `0 0 16px ${colors.main}44` }}>
      <div className="text-lg font-semibold text-center" style={{ color: colors.accent, fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>{label}</div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} style={{ background: bg, '--thumb-color': colors.secondary } as any} className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--thumb-color)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--thumb-color)] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer" />
    </div>
  )
}
