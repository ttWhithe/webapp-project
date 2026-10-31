import ElementIcon from './ElementIcon'
import type { Element } from '@/shared/api/types'

interface Props {
  label: string
  value: number | null
  onChange: (next: number | null) => void
  suffix?: string
  min?: number
  max?: number
  step?: number
  colors?: { main: string; secondary: string; accent: string }
  disabled?: boolean
  className?: string
  element?: Element
}

export default function StatInput({
  label, value, onChange, suffix, min, max, step = 1, colors, disabled, className, element
}: Props) {
  const bg = colors?.main ?? '#1e293b'
  const fg = colors?.secondary ?? '#cbd5e1'
  const border = colors?.secondary ?? '#334155'

  return (
    <label className={`block ${className ?? ''}`}>
      <div className="flex items-center gap-1 mb-1">
        {element && colors && (
          <ElementIcon element={element} className="w-3.5 h-3.5" color={colors.main} glowColor={colors.secondary} outlineColor={colors.secondary} outlineWidth={0.3} />
        )}
        <span className="block text-[11px] uppercase tracking-wide font-semibold" style={{ color: fg }}>
          {label}
        </span>
      </div>
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
          min={min} max={max} step={step} disabled={disabled}
          className="w-full px-3 py-2 pr-8 rounded-lg outline-none text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: bg,
            border: `2px solid ${border}`,
            color: fg,
            fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
          }}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: fg, opacity: 0.7 }}>{suffix}</span>}
      </div>
    </label>
  )
}
