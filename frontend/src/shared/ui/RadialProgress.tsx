import CircularProgress from './CircularProgress'

export interface RadialItem {
  key: string
  label: string
  value: number // 0-100
  /** Emoji placeholder for the slot icon (weapon / artifact) */
  icon: string
}

interface OuterSlotConfig {
  /** Скрыть слот, но оставить место в геометрии */
  hidden?: boolean
  /** progress (по умолчанию) — с кольцом и процентом; plain — просто круг */
  variant?: 'progress' | 'plain'
  /** Иконка для plain-варианта (emoji сейчас, SVG позже) */
  icon?: string
  /** Подпись при наведении */
  label?: string
  /** Отключён (неактивен, но видим) */
  disabled?: boolean
}

interface Props {
  total: number
  items: RadialItem[]
  colors: { main: string; secondary: string; accent: string }
  size?: number
  onOuterClick?: (i: number) => void
  onMiddleClick?: (key: string, i: number) => void
  outerSlotsConfig?: OuterSlotConfig[]
}

const OUTER_DOTS = 14

export default function RadialProgress({
  total,
  items,
  colors,
  size = 480,
  onOuterClick,
  onMiddleClick,
  outerSlotsConfig,
}: Props) {
  const half = size / 2

  // Radii — slightly wider to accommodate bigger circles
  const outerRadius = size * 0.48
  const middleRadius = size * 0.27

  // Sizes
  const centerSize = size * 0.30
  const middleSize = size * 0.20
  const outerSize = size * 0.15

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      {/* Outer ring — 14 slots, config-driven */}
      {Array.from({ length: OUTER_DOTS }).map((_, i) => {
        const theta = (2 * Math.PI * i) / OUTER_DOTS - Math.PI / 2
        const x = half + outerRadius * Math.cos(theta)
        const y = half + outerRadius * Math.sin(theta)
        const cfg = outerSlotsConfig?.[i] ?? {}
        const left = x - outerSize / 2
        const top = y - outerSize / 2

        // Hidden slot — render invisible placeholder to preserve geometry
        if (cfg.hidden) {
          return (
            <div
              key={`outer-${i}`}
              style={{
                position: 'absolute',
                width: outerSize,
                height: outerSize,
                left,
                top,
                visibility: 'hidden',
                pointerEvents: 'none',
              }}
            />
          )
        }

        // Plain variant — just a circle (constellation nav etc.)
        if (cfg.variant === 'plain') {
          return (
            <button
              key={`outer-${i}`}
              type="button"
              onClick={() => !cfg.disabled && onOuterClick?.(i)}
              title={cfg.label ?? `Слот ${i + 1}`}
              disabled={cfg.disabled}
              className={`absolute rounded-full flex items-center justify-center transition-transform duration-300 ${
                cfg.disabled ? 'cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
              }`}
              style={{
                width: outerSize,
                height: outerSize,
                left,
                top,
                backgroundColor: `${colors.main}55`,
                border: `2px solid ${colors.secondary}`,
                boxShadow: `0 0 14px ${colors.main}77`,
                fontSize: outerSize * 0.42,
                opacity: cfg.disabled ? 0.4 : 1,
              }}
            >
              {cfg.icon}
            </button>
          )
        }

        // Default: progress variant
        const outerValue = 0
        return (
          <button
            key={`outer-${i}`}
            type="button"
            onClick={() => !cfg.disabled && onOuterClick?.(i)}
            disabled={cfg.disabled}
            title={cfg.label ?? `Слот ${i + 1}`}
            className={`absolute transition-transform duration-300 ${
              cfg.disabled ? 'cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
            }`}
            style={{
              width: outerSize,
              left,
              top,
              background: 'transparent',
              border: 'none',
              padding: 0,
              opacity: cfg.disabled ? 0.4 : 1,
            }}
          >
            <div className="relative" style={{ width: outerSize, height: outerSize }}>
              <CircularProgress
                value={outerValue}
                size={outerSize}
                strokeWidth={12}
                fillColor={colors.secondary}
                emptyColor={colors.main}
                innerColor={colors.main}
                borderColor={colors.secondary}
                textColor={colors.secondary}
                hideLabel
                borderWidth={2}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 font-bold pointer-events-none"
                style={{
                  bottom: outerSize * 0.08,
                  fontSize: outerSize * 0.22,
                  color: colors.secondary,
                  textShadow: `0 0 2px ${colors.accent}, 0 0 4px ${colors.accent}88`,
                  fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                  lineHeight: 1,
                }}
              >
                {Math.round(outerValue)}%
              </div>
            </div>
          </button>
        )
      })}

      {/* Middle ring — 6 clickable equipment slots, clockwise from left */}
      {items.map((item, i) => {
        const theta = Math.PI + (i * 2 * Math.PI) / items.length
        const x = half + middleRadius * Math.cos(theta)
        const y = half + middleRadius * Math.sin(theta)
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onMiddleClick?.(item.key, i)}
            title={`${item.label}: ${item.value}%`}
            className="absolute transition-transform duration-300 hover:scale-110 cursor-pointer"
            style={{
              width: middleSize,
              left: x - middleSize / 2,
              top: y - middleSize / 2,
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
          >
            <div className="relative" style={{ width: middleSize, height: middleSize }}>
              <CircularProgress
                value={item.value}
                size={middleSize}
                strokeWidth={15}
                fillColor={colors.secondary}
                emptyColor={colors.main}
                innerColor={colors.main}
                borderColor={colors.secondary}
                textColor={colors.secondary}
                hideLabel
                borderWidth={3}
              />
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  fontSize: middleSize * 0.42,
                  lineHeight: 1,
                  paddingBottom: middleSize * 0.18,
                }}
              >
                {item.icon}
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 font-bold"
                style={{
                  bottom: middleSize * 0.07,
                  fontSize: middleSize * 0.19,
                  color: colors.secondary,
                  textShadow: `0 0 2px ${colors.accent}, 0 0 4px ${colors.accent}88`,
                  fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                  lineHeight: 1,
                }}
              >
                {Math.round(item.value)}%
              </div>
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap pointer-events-none"
              style={{
                top: middleSize + 2,
                color: colors.accent,
              }}
            >
              {item.label}
            </div>
          </button>
        )
      })}

      {/* Center — total progress, clickable */}
      <button
        type="button"
        onClick={() => onMiddleClick?.('total', -1)}
        title={`Общий прогресс: ${total}%`}
        className="absolute transition-transform duration-300 hover:scale-105 cursor-pointer"
        style={{
          width: centerSize,
          height: centerSize,
          left: half - centerSize / 2,
          top: half - centerSize / 2,
          background: 'transparent',
          border: 'none',
          padding: 0,
        }}
      >
        <CircularProgress
          value={total}
          size={centerSize}
          strokeWidth={17}
          fillColor={colors.secondary}
          emptyColor={colors.main}
          innerColor={colors.main}
          borderColor={colors.secondary}
          textColor={colors.secondary}
          textStroke={colors.accent}
          borderWidth={3}
        />
      </button>
    </div>
  )
}
