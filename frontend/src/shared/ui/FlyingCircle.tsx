import CircularProgress from './CircularProgress'

export interface CircleTarget {
  /** Viewport X of top-left corner, px */
  x: number
  /** Viewport Y of top-left corner, px */
  y: number
  /** Diameter, px */
  size: number
}

interface Props {
  target: CircleTarget
  value: number
  icon: string
  colors: { main: string; secondary: string; accent: string }
  /** Optional value badge near the bottom (for level/talents) */
  crownAt?: number
  /** Hide the whole circle */
  hidden?: boolean
  className?: string
}

/**
 * One circle that smoothly animates between target positions.
 * Positioned `fixed` in viewport coords — coordinates come from parent.
 */
export default function FlyingCircle({
  target,
  value,
  icon,
  colors,
  crownAt,
  hidden = false,
  className,
}: Props) {
  const isCrowned = crownAt != null && value >= crownAt

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        left: target.x,
        top: target.y,
        width: target.size,
        height: target.size,
        zIndex: 30,
        pointerEvents: hidden ? 'none' : 'auto',
        opacity: hidden ? 0 : 1,
        transition:
          'left 700ms ease-in-out, top 700ms ease-in-out, width 700ms ease-in-out, height 700ms ease-in-out, opacity 300ms',
      }}
    >
      <div
        className="relative w-full h-full rounded-full"
        style={{
          backgroundColor: colors.main,
          border: `2px solid ${colors.secondary}`,
        }}
      >
        {/* Ring */}
        <CircularProgress
          value={value}
          size={target.size - 4}
          strokeWidth={Math.max(4, Math.round(target.size * 0.09))}
          fillColor={colors.secondary}
          emptyColor="transparent"
          innerColor="transparent"
          borderColor="transparent"
          borderWidth={0}
          hideLabel
        />

        {/* Icon */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{
            fontSize: target.size * 0.32,
            lineHeight: 1,
            paddingBottom: target.size * 0.2,
          }}
        >
          {icon}
        </div>

        {/* Value + crown */}
        <div
          className="absolute left-1/2 -translate-x-1/2 font-bold leading-none pointer-events-none flex items-center gap-0.5"
          style={{
            bottom: target.size * 0.08,
            color: isCrowned ? '#fde047' : colors.accent,
            fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
            fontSize: target.size * 0.2,
            textShadow: `0 0 3px ${colors.secondary}`,
          }}
        >
          {isCrowned && <span style={{ fontSize: '0.9em' }}>👑</span>}
          <span>{value}</span>
        </div>
      </div>
    </div>
  )
}
