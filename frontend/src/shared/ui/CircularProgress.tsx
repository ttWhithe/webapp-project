interface Props {
  value: number
  size?: number
  strokeWidth?: number
  fillColor?: string
  emptyColor?: string
  innerColor?: string
  borderColor?: string
  textColor?: string
  textStroke?: string
  /** If true, the built-in % label is not rendered */
  hideLabel?: boolean
  /** Thickness of the border around the inner circle */
  borderWidth?: number
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
  textStroke,
  hideLabel = false,
  borderWidth = 1,
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
          border: `${borderWidth}px solid ${border}`,
        }}
      >
        {hideLabel ? null : (
          <span
            className="font-bold leading-none"
            style={{
              color: text,
              fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
              fontSize: size * 0.32,
              textShadow: textStroke
                ? `0 0 2px ${textStroke}, 0 0 4px ${textStroke}66`
                : `0 0 4px ${text}`,
            }}
          >
            {Math.round(clamped)}%
          </span>
        )}
      </div>
    </div>
  )
}
