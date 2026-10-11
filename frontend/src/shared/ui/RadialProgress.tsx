interface OuterSlotConfig {
  hidden?: boolean
  variant?: 'progress' | 'plain'
  icon?: string
  label?: string
  disabled?: boolean
  /** Raw value (shown as number, e.g. 78) */
  value?: number
  /** 0-100 for the ring fill */
  ringPercent?: number
  /** Custom angle in degrees (0 = top, 90 = right, 180 = left). Overrides default slot formula. */
  angle?: number
  /** If value >= crownAt, show crown + yellow digit */
  crownAt?: number
  /** Crown color (defaults to #fde047) */
  crownColor?: string
}

export interface RadialItem {
  key: string
  label: string
  value: number
  icon: string
  /** If set, shows this instead of "N%" — e.g. weapon level "90" */
  rawValue?: string | number
  /** Optional stars shown as superscript next to rawValue (e.g. refinement) */
  stars?: number
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

  // Radii — outer pushed ~10px out (approx. +0.016 of size at 620px)
  const outerRadius = size * 0.44 + 10
  const middleRadius = size * 0.26

  // Sizes — bigger to match the original layout
  const centerSize = size * 0.29
  const middleSize = size * 0.19
  const outerSize = size * 0.15

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      {/* ---- Outer ring: 14 slots ---- */}
      {Array.from({ length: OUTER_DOTS }).map((_, i) => {
        const cfg = outerSlotsConfig?.[i] ?? {}
        const theta =
          cfg.angle != null
            ? (cfg.angle * Math.PI) / 180
            : (2 * Math.PI * i) / OUTER_DOTS - Math.PI / 2
        const x = half + outerRadius * Math.cos(theta)
        const y = half + outerRadius * Math.sin(theta)
        const left = x - outerSize / 2
        const top = y - outerSize / 2

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

        if (cfg.variant === 'plain') {
          return (
            <button
              key={`outer-${i}`}
              type="button"
              onClick={() => !cfg.disabled && onOuterClick?.(i)}
              disabled={cfg.disabled}
              title={cfg.label ?? `Слот ${i + 1}`}
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
        const outerValue = cfg.value ?? 0
        const outerRingPct = cfg.ringPercent ?? 0
        const crownAt = cfg.crownAt
        const crownColor = cfg.crownColor ?? '#fde047'
        const isCrowned = crownAt != null && outerValue >= crownAt
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
            <div
              className="relative rounded-full"
              style={{ width: outerSize, height: outerSize }}
            >
              {/* progress ring via conic-gradient — simple, no SVG double-render */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${colors.secondary} 0deg ${outerRingPct * 3.6}deg, ${colors.main} ${outerRingPct * 3.6}deg 360deg)`,
                  border: `2px solid ${colors.secondary}`,
                  boxSizing: 'border-box',
                }}
              />
              {/* inner circle with main bg — hides the gradient center */}
              <div
                className="absolute rounded-full"
                style={{
                  top: outerSize * 0.18,
                  left: outerSize * 0.18,
                  right: outerSize * 0.18,
                  bottom: outerSize * 0.18,
                  backgroundColor: colors.main,
                  border: `2px solid ${colors.secondary}`,
                  boxSizing: 'border-box',
                }}
              />
              {/* icon */}
              {cfg.icon && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                  style={{
                    fontSize: outerSize * 0.32,
                    lineHeight: 1,
                    paddingBottom: outerSize * 0.22,
                  }}
                >
                  {cfg.icon}
                </div>
              )}
              {/* value under icon (+ crown when above cap) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 font-bold pointer-events-none flex items-center gap-0.5"
                style={{
                  bottom: outerSize * 0.07,
                  fontSize: outerSize * 0.22,
                  color: isCrowned ? crownColor : colors.accent,
                  textShadow: `0 0 2px ${colors.secondary}, 0 0 4px ${colors.secondary}88`,
                  fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                  lineHeight: 1,
                }}
              >
                {isCrowned && <span style={{ fontSize: '0.9em' }}>👑</span>}
                <span>{Math.round(outerValue)}</span>
              </div>
            </div>
          </button>
        )
      })}

      {/* ---- Middle ring: 6 equipment slots ---- */}
      {items.map((item, i) => {
        const theta = Math.PI - (i * 2 * Math.PI) / items.length
        const x = half + middleRadius * Math.cos(theta)
        const y = half + middleRadius * Math.sin(theta)
        const ringPct = Math.max(0, Math.min(100, item.value))
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onMiddleClick?.(item.key, i)}
            title={item.label}
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
            <div
              className="relative"
              style={{ width: middleSize, height: middleSize }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${colors.secondary} 0deg ${ringPct * 3.6}deg, ${colors.main} ${ringPct * 3.6}deg 360deg)`,
                  border: `2px solid ${colors.secondary}`,
                  boxSizing: 'border-box',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  top: middleSize * 0.16,
                  left: middleSize * 0.16,
                  right: middleSize * 0.16,
                  bottom: middleSize * 0.16,
                  backgroundColor: colors.main,
                  border: `2px solid ${colors.secondary}`,
                  boxSizing: 'border-box',
                }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                style={{
                  fontSize: middleSize * 0.4,
                  lineHeight: 1,
                  paddingBottom: middleSize * 0.2,
                }}
              >
                {item.icon}
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 font-bold pointer-events-none flex items-start"
                style={{
                  bottom: middleSize * 0.06,
                  fontSize: middleSize * 0.22,
                  color: colors.accent,
                  textShadow: `0 0 2px ${colors.secondary}, 0 0 4px ${colors.secondary}88`,
                  fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                  lineHeight: 1,
                }}
              >
                {item.rawValue != null ? (
                  <>
                    <span>{item.rawValue}</span>
                    {item.stars != null && item.stars > 0 && (
                      <span
                        style={{
                          fontSize: '0.6em',
                          color: '#fde047',
                          marginLeft: 2,
                          marginTop: -2,
                        }}
                      >
                        ★{item.stars}
                      </span>
                    )}
                  </>
                ) : (
                  <span>{Math.round(item.value)}%</span>
                )}
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

      {/* ---- Center: total ---- */}
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
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${colors.secondary} 0deg ${Math.min(100, total) * 3.6}deg, ${colors.main} ${Math.min(100, total) * 3.6}deg 360deg)`,
            border: `3px solid ${colors.secondary}`,
            boxSizing: 'border-box',
          }}
        />
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            top: centerSize * 0.14,
            left: centerSize * 0.14,
            right: centerSize * 0.14,
            bottom: centerSize * 0.14,
            backgroundColor: colors.main,
            border: `3px solid ${colors.secondary}`,
            boxSizing: 'border-box',
          }}
        >
          <span
            className="font-bold leading-none"
            style={{
              color: colors.secondary,
              fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
              fontSize: centerSize * 0.32,
              textShadow: `0 0 4px ${colors.accent}`,
            }}
          >
            {Math.round(total)}%
          </span>
        </div>
      </button>
    </div>
  )
}
