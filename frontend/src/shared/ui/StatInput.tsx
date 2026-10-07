interface Props {
  label: string
  value: number | null
  onChange: (next: number | null) => void
  /** Suffix displayed on the right (%, nothing, etc.) */
  suffix?: string
  /** Min value; empty string clears to null */
  min?: number
  max?: number
  step?: number
  /** Accent color for focus border */
  accentColor?: string
  disabled?: boolean
  className?: string
}

export default function StatInput({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step = 1,
  accentColor = '#818cf8',
  disabled,
  className,
}: Props) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') return onChange(null)
            const num = Number(raw)
            if (Number.isNaN(num)) return
            onChange(num)
          }}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-full px-3 py-2 pr-8 rounded-lg bg-slate-800 border border-slate-700 outline-none text-slate-100 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            // @ts-expect-error CSS custom prop
            '--accent-color': accentColor,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = accentColor)}
          onBlur={(e) => (e.currentTarget.style.borderColor = '')}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}
