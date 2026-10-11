interface Props {
  icon: string
  label: string
  selected: boolean
  filled: boolean
  progress: number // 0-100
  /** Level text shown at the bottom of the circle. E.g. "90" or "+20" */
  levelText?: string
  /** Stars shown as superscript next to levelText (weapon refinement) */
  stars?: number
  colors: { main: string; secondary: string; accent: string }
  onClick: () => void
}

const SIZE = 128 // px — circle diameter

export default function EquipmentSlotButton({
  icon,
  label,
  selected,
  filled,
  progress,
  levelText,
  stars,
  colors,
  onClick,
}: Props) {
  const ringDeg = Math.min(100, Math.max(0, progress)) * 3.6

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`relative shrink-0 rounded-full transition-transform duration-200 cursor-pointer ${
        selected ? 'scale-110' : 'hover:scale-105'
      }`}
      style={{
        width: SIZE,
        height: SIZE,
        background: `conic-gradient(
          ${colors.secondary} 0deg ${ringDeg}deg,
          ${colors.main} ${ringDeg}deg 360deg
        )`,
        border: `${selected ? 5 : 3}px solid ${colors.secondary}`,
        boxSizing: 'border-box',
        boxShadow: selected
          ? `0 0 26px ${colors.accent}88, 0 0 12px ${colors.main}`
          : `0 0 12px ${colors.main}44`,
      }}
    >
      {/* Inner circle */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          top: '12%',
          left: '12%',
          right: '12%',
          bottom: '12%',
          backgroundColor: colors.main,
          border: `3px solid ${colors.secondary}`,
          boxSizing: 'border-box',
        }}
      >
        {/* Icon — upper area */}
        <span
          className="leading-none pointer-events-none select-none"
          style={{
            fontSize: 34,
            paddingBottom: 10,
            opacity: filled ? 1 : 0.55,
          }}
        >
          {icon}
        </span>
      </div>

      {/* Level + stars — at the bottom, inside the ring */}
      {levelText != null && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-start font-bold pointer-events-none"
          style={{
            bottom: 6,
            color: colors.accent,
            fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
            fontSize: 22,
            textShadow: `0 0 3px ${colors.secondary}`,
            lineHeight: 1,
          }}
        >
          <span>{levelText}</span>
          {stars != null && stars > 0 && (
            <span
              style={{
                fontSize: '0.55em',
                color: '#fde047',
                marginLeft: 2,
                marginTop: -2,
              }}
            >
              ★{stars}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
