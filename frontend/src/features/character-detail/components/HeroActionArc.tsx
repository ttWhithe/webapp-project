import { Link } from 'react-router-dom'

export function HeroActionArc({ colors }: { colors: any }) {
  const CONTAINER = 200, BTN = 52, cx = CONTAINER - BTN / 2 - 6, cy = BTN / 2 + 6, radius = CONTAINER - BTN - 6
  const angles = [90, 112.5, 135, 157.5, 180]
  return (
    <div className="absolute bottom-3 left-3 z-20 rounded-2xl" style={{ width: CONTAINER, height: CONTAINER, backgroundColor: `${colors.secondary}33`, border: `1.5px solid ${colors.secondary}99`, backdropFilter: 'blur(8px)', boxShadow: `inset 0 0 30px ${colors.main}22` }}>
      {angles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const x = cx + radius * Math.cos(rad), y = cy + radius * Math.sin(rad)
        if (i === 2) return <Link key={i} to="/characters" title="К каталогу" className="absolute rounded-full flex items-center justify-center text-2xl font-bold transition-transform duration-300 hover:scale-110" style={{ width: BTN, height: BTN, left: x - BTN / 2, top: y - BTN / 2, backgroundColor: colors.main, border: `2.5px solid ${colors.secondary}`, color: colors.secondary, boxShadow: `0 0 22px ${colors.main}, 0 0 10px ${colors.accent}66` }}>←</Link>
        return <button key={i} type="button" disabled title="Скоро" className="absolute rounded-full cursor-not-allowed" style={{ width: BTN, height: BTN, left: x - BTN / 2, top: y - BTN / 2, backgroundColor: `${colors.main}55`, border: `1.5px solid ${colors.secondary}aa`, opacity: 0.6 }} />
      })}
    </div>
  )
}
