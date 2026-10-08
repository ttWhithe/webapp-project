import type { CSSProperties } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  icon?: string
  colors: { main: string; secondary: string; accent: string }
  disabled?: boolean
  /** Total module height, px */
  height?: number
  /** If value >= this threshold, show a crown + yellow number. */
  crownAt?: number
  /** Value at which the ring reaches 100%. Defaults to `max` (min→max scale). */
  ringCap?: number
  /** Color of the crown icon + digits when value >= crownAt. Defaults to #fde047. */
  crownColor?: string
}

export default function ProgressSlider({
  label,
  value,
  min,
  max,
  onChange,
  icon,
  colors,
  disabled = false,
  height = 96,
  crownAt,
  ringCap,
  crownColor = '#fde047',
}: Props) {
  // Ring: progress toward the "cap" (where 100% is reached). Used only for the circular ring.
  const ringPercent =
    ringCap != null && ringCap > 0
      ? Math.max(0, Math.min(1, value / ringCap)) * 100
      : max > min
        ? ((value - min) / (max - min)) * 100
        : 0

  // Slider fill: always maps min..max → 0..100%. Matches the native thumb position.
  const sliderPercent = max > min ? ((value - min) / (max - min)) * 100 : 0

  // --- Layered geometry, from outside in -------------------------------
  const moduleBorder = 4          // module pill outline
  const contentHeight = height - moduleBorder * 2 // inner height = circle size

  const circleOuterBorder = 5     // thin secondary outline around the whole circle
  const ringStroke = 14           // progress ring — 2x previous (was 5)
  const innerBorder = 4           // border of the inner (main) circle

  // SVG occupies the space inside the circle's outer outline
  const svgSize = contentHeight - circleOuterBorder * 2
  const ringRadius = (svgSize - ringStroke) / 2
  const circumference = 2 * Math.PI * ringRadius
  const dashOffset = circumference * (1 - ringPercent / 100)

  // Inner circle — much smaller now (ring is fat)
  const innerCircleSize = svgSize - ringStroke * 2

  // Slider track: filled = secondary, empty = accent. Uses sliderPercent, NOT ringPercent.
  const sliderBg = `linear-gradient(to right,
    ${colors.secondary} 0%,
    ${colors.secondary} ${sliderPercent}%,
    ${colors.accent} ${sliderPercent}%,
    ${colors.accent} 100%)`

  return (
    <div
      className="flex rounded-full"
      style={{
        boxSizing: 'border-box',
        height,
        backgroundColor: colors.main,
        border: `${moduleBorder}px solid ${colors.secondary}`,
        padding: '0 24px 0 0',
        boxShadow: `0 0 24px ${colors.main}66`,
      }}
    >
      {/* Circle — outer thin secondary outline, then fat ring, then inner circle */}
      <div
        className="relative shrink-0 rounded-full"
        style={{
          boxSizing: 'border-box',
          width: contentHeight,
          height: contentHeight,
          border: `${circleOuterBorder}px solid ${colors.secondary}`,
        }}
      >
        {/* Progress ring: empty = main, filled = secondary */}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="absolute"
          style={{ top: 0, left: 0, display: 'block' }}
        >
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={ringRadius}
            fill="none"
            stroke={colors.main}
            strokeWidth={ringStroke}
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={ringRadius}
            fill="none"
            stroke={colors.secondary}
            strokeWidth={ringStroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
            style={{ transition: 'stroke-dashoffset 250ms ease-out' }}
          />
        </svg>

        {/* Inner circle: main bg + secondary border, hugs the ring's inner edge */}
        <div
          className="absolute rounded-full"
          style={{
            boxSizing: 'border-box',
            top: ringStroke,
            left: ringStroke,
            width: innerCircleSize,
            height: innerCircleSize,
            backgroundColor: colors.main,
            border: `${innerBorder}px solid ${colors.secondary}`,
          }}
        >
          {/* Icon — upper area */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ paddingBottom: innerCircleSize * 0.2 }}
          >
            <span
              className="leading-none"
              style={{ fontSize: innerCircleSize * 0.42 }}
            >
              {icon ?? '◆'}
            </span>
          </div>
        </div>

        {/* Value — absolutely positioned inside the WHOLE circle, can sit on the ring */}
        {(() => {
          const isCrowned = crownAt != null && value >= crownAt
          return (
            <div
              className="absolute left-1/2 -translate-x-1/2 font-bold leading-none pointer-events-none flex items-center gap-1"
              style={{
                bottom: 4,
                color: isCrowned ? crownColor : colors.accent,
                fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                fontSize: contentHeight * 0.24,
                textShadow: `0 0 4px ${colors.secondary}`,
              }}
            >
              {isCrowned && <span style={{ fontSize: '1.1em' }}>👑</span>}
              <span>{value}</span>
            </div>
          )
        })()}
      </div>

      {/* Right: label + slider */}
      <div className="flex-1 min-w-0 flex flex-col justify-center pt-1 pb-4">
        <div
          className="text-2xl font-semibold mb-4 text-center truncate"
          style={{
            color: colors.accent,
            fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
          }}
        >
          {label}
        </div>

        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          style={
            {
              background: sliderBg,
              '--thumb-color': colors.secondary,
            } as CSSProperties
          }
          className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[var(--thumb-color)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[var(--thumb-color)]
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </div>
  )
}
