interface Props {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  /** Color of the filled (progress) portion */
  fillColor?: string
  /** Color of the empty (background) portion */
  emptyColor?: string
  /** Inner circle color (same as empty by default) */
  innerColor?: string
  /** Border color around inner circle */
  borderColor?: string
  /** Text color */
  textColor?: string
  showLabel?: boolean
  className?: string
}

export default function CircularProgress({
  value,
  size = 40,
  strokeWidth = 5,
  fillColor = '#fca5a5',
  emptyColor = '#ef4444',
  innerColor,
  borderColor,
  textColor,
  showLabel = true,
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(100, value))
  const deg = (clamped / 100) * 360

  const inner = innerColor ?? emptyColor
  const border = borderColor ?? fillColor
  const text = textColor ?? fillColor

  return (
    <div
      className={`relative rounded-full ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${fillColor} 0deg ${deg}deg, ${emptyColor} ${deg}deg 360deg)`,
        filter: `drop-shadow(0 0 4px ${fillColor}80)`,
      }}
    >
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          top: strokeWidth,
          left: strokeWidth,
          right: strokeWidth,
          bottom: strokeWidth,
          backgroundColor: inner,
          border: `1px solid ${border}`,
        }}
      >
        {showLabel && (
          <span
            className="font-bold leading-none"
            style={{
              color: text,
              fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
              fontSize: size * 0.32,
              textShadow: `0 0 4px ${text}`,
            }}
          >
            {Math.round(clamped)}%
          </span>
        )}
      </div>
    </div>
  )
}
