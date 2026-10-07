interface Props {
  total: number
  current: number
  onSelect: (index: number) => void
  size?: number
  radiusRatio?: number
  dotSizeRatio?: number
}

/**
 * Circular ring of clickable dots around a portrait.
 * Uses absolute positioning calculated on the fly.
 */
export default function SectionDots({
  total,
  current,
  onSelect,
  size = 320,
  radiusRatio = 0.45,
  dotSizeRatio = 0.11,
}: Props) {
  const R = size * radiusRatio
  const dotSize = size * dotSizeRatio
  const center = size / 2

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size }}
      aria-label="Навигация по секциям"
    >
      {Array.from({ length: total }).map((_, i) => {
        const theta = (2 * Math.PI * i) / total - Math.PI / 2
        const x = center + R * Math.cos(theta)
        const y = center + R * Math.sin(theta)
        const active = i === current
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            title={`Секция ${i + 1}`}
            className={`absolute rounded-full transition-all duration-300 ${
              active
                ? 'bg-indigo-400 shadow-[0_0_16px_rgba(129,140,248,0.9)] scale-125'
                : 'bg-slate-600 hover:bg-slate-400'
            }`}
            style={{
              width: dotSize,
              height: dotSize,
              left: x - dotSize / 2,
              top: y - dotSize / 2,
            }}
          />
        )
      })}
    </div>
  )
}
