import type { CSSProperties } from 'react'
import FriendshipIcon from './FriendshipIcon'

interface Props {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  icon?: string
  colors: { main: string; secondary: string; accent: string }
  valueColor?: string
  disabled?: boolean
  height?: number
  goldenAt?: number
  goldenColor?: string
  ringCap?: number
  badge?: React.ReactNode
}

export default function ProgressSlider({
  label,
  value,
  min,
  max,
  onChange,
  icon,
  colors,
  valueColor,
  disabled = false,
  height = 96,
  goldenAt,
  goldenColor = '#fde047',
  ringCap,
  badge,
}: Props) {
  const moduleBorder = 4
  const circleOuterBorder = 3
  const ringStroke = 18
  const innerBorder = 3

  const contentHeight = height - moduleBorder * 2

  const ringPercent =
    ringCap != null && ringCap > 0
      ? Math.max(0, Math.min(1, value / ringCap)) * 100
      : max > min
        ? ((value - min) / (max - min)) * 100
        : 0

  const sliderPercent = max > min ? ((value - min) / (max - min)) * 100 : 0

  const sliderBg = `linear-gradient(to right,
    ${colors.secondary} 0%,
    ${colors.secondary} ${sliderPercent}%,
    ${colors.accent} ${sliderPercent}%,
    ${colors.accent} 100%)`

  const isGolden = goldenAt != null && value >= goldenAt
  const innerSize = contentHeight - circleOuterBorder * 2 - ringStroke * 2
  const isImage = icon?.startsWith('http') || icon?.startsWith('/')

  return (
    <div
      className="group flex rounded-full"
      style={{
        boxSizing: 'border-box',
        height,
        backgroundColor: colors.main,
        border: `${moduleBorder}px solid ${colors.secondary}`,
        padding: '0 24px 0 0',
        boxShadow: `0 0 24px ${colors.main}66`,
        overflow: 'visible',
      }}
    >
      <div
        className="relative shrink-0 transition-transform duration-300 ease-out scale-110 group-hover:scale-[1.21]"
        style={{
          width: contentHeight,
          height: contentHeight,
          borderRadius: '50%',
          border: `${circleOuterBorder}px solid ${colors.secondary}`,
          boxSizing: 'border-box',
          transformOrigin: 'center',
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(
              ${colors.secondary} 0deg ${ringPercent * 3.6}deg,
              ${colors.main} ${ringPercent * 3.6}deg 360deg
            )`,
          }}
        />

        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            top: ringStroke - 1,
            left: ringStroke - 1,
            right: ringStroke - 1,
            bottom: ringStroke - 1,
            backgroundColor: colors.main,
            border: `${innerBorder}px solid ${colors.secondary}`,
            boxSizing: 'border-box',
          }}
        >
          <span
            className="leading-none select-none pointer-events-none flex items-center justify-center w-full h-full"
            style={{ fontSize: innerSize * 0.42 }}
          >
            {icon === '/icons/ui/friendship.svg' ? (
              <FriendshipIcon className="w-[85%] h-[85%]" color={colors.secondary} />
            ) : icon === '/icons/ui/exp.png' ? (
              <img src={icon} alt="" className="w-[80%] h-[80%] object-contain" />
            ) : isImage ? (
              <img src={icon} alt="" className="object-contain" />
            ) : (
              icon ?? '◆'
            )}
          </span>
        </div>

        <div
          className="absolute left-1/2 -translate-x-1/2 font-bold leading-none pointer-events-none flex items-center gap-1"
          style={{
            bottom: 2,
            color: isGolden ? goldenColor : (valueColor ?? colors.accent),
            fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
            fontSize: contentHeight * 0.24,
            textShadow: `0 0 4px ${colors.secondary}`,
            zIndex: 5,
          }}
        >
          <span>{value}</span>
          {badge}
        </div>
      </div>

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

        <div className="px-[20px]">
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
    </div>
  )
}
