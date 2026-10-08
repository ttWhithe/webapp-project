interface Props {
  label: string
  value: number | null
  onChange: (next: number | null) => void
  /** Suffix displayed on the right (%, nothing, etc.) */
  suffix?: string
  min?: number
  max?: number
  step?: number
  /** Element palette: main = input bg, secondary = border + label + text */
  colors?: { main: string; secondary: string; accent: string }
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
  colors,
  disabled,
  className,
}: Props) {
  const bg = colors?.main ?? '#1e293b'      // slate-800
  const fg = colors?.secondary ?? '#cbd5e1' // slate-300
  const border = colors?.secondary ?? '#334155' // slate-700

  return (
    <label className={`block ${className ?? ''}`}>
      <span
        className="block text-[11px] uppercase tracking-wide font-semibold mb-1"
        style={{ color: fg }}
      >
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
          className="w-full px-3 py-2 pr-8 rounded-lg outline-none text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: bg,
            border: `2px solid ${border}`,
            color: fg,
            fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
          }}
        />
        {suffix && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
            style={{ color: fg, opacity: 0.7 }}
          >
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}
