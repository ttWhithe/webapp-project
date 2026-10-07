interface Props {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  showLabel?: boolean
  className?: string
}

export default function CircularProgress({
  value,
  size = 44,
  strokeWidth = 4,
  color = '#818cf8',
  trackColor = 'rgba(0,0,0,0.4)',
  showLabel = true,
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      {showLabel && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size * 0.3}
          fontWeight="bold"
        >
          {Math.round(clamped)}
        </text>
      )}
    </svg>
  )
}
