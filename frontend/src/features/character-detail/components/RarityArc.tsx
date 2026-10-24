export function RarityArc({ value, minRarity, maxRarity, colors, size, onChange }: any) {
  const BTN = 60
  const radius = size * 0.6
  const cx = size / 2, cy = size / 2
  return (
    <>
      {[1, 2, 3, 4, 5].map((rank) => {
        const deg = 210 + (rank - 1) * 30
        const rad = (deg * Math.PI) / 180
        const x = cx + radius * Math.sin(rad)
        const y = cy - radius * Math.cos(rad)
        const active = value === rank
        const disabled = rank > maxRarity || rank < minRarity || value === 0

        return (
          <button
            key={rank}
            type="button"
            disabled={disabled}
            onClick={() => onChange(rank)}
            title={disabled ? "Недоступно" : `Редкость ${rank}`}
            className={`absolute rounded-full flex items-center justify-center transition-all duration-200 ${disabled ? 'cursor-not-allowed opacity-20 grayscale' : 'hover:scale-110 cursor-pointer'}`}
            style={{
              width: BTN, height: BTN, left: x - BTN / 2, top: y - BTN / 2,
              backgroundColor: colors.main,
              border: `3px solid ${colors.secondary}`,
              boxShadow: active ? `0 0 24px ${colors.accent}88, 0 0 10px ${colors.main}` : `0 0 10px ${colors.main}55`,
              opacity: active ? 1 : 0.5,
              zIndex: active ? 10 : 5
            }}
          >
            <span className="leading-none font-bold" style={{ color: active ? '#fde047' : colors.accent, fontSize: 24, lineHeight: 1 }}>★</span>
            <span className="leading-none font-bold" style={{ color: active ? '#fde047' : colors.accent, fontSize: 16, fontFamily: "'Comic Sans MS', 'Comic Sans', cursive", lineHeight: 1, marginTop: 2 }}>{rank}</span>
          </button>
        )
      })}
    </>
  )
}
