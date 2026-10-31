import { ELEMENT_HEX } from '@/shared/lib/catalog-meta'
import { Link } from 'react-router-dom'

export function ZoneConstellations({ character, draft, onUpdate, isSaving, lastSaved, goTo }: any) {
  const colors = ELEMENT_HEX[character.element as keyof typeof ELEMENT_HEX]

  if (!draft) {
    return (
      <section className="h-screen flex items-center justify-center px-4 bg-slate-900 overflow-hidden">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Созвездия</h2>
          <p className="text-slate-400 mb-6">Этот персонаж пока не в вашем трекере.</p>
          <Link to="/me/characters" className="inline-block px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 font-medium">Перейти в трекер</Link>
        </div>
      </section>
    )
  }

  const currentLevel = draft.constellation || 0

  let consts: any = character.constellations || {}
  if (typeof consts === 'string') {
    try { consts = JSON.parse(consts) } catch (e) { consts = {} }
  }

  const angles = [-70, -42, -14, 14, 42, 70];
  const radius = 280;

  return (
    <section className="h-full relative overflow-hidden" style={{ background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)` }}>

      {/* ШАПКА */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => goTo(0)}
            className="w-[80px] h-[80px] rounded-full flex items-center justify-center transition-transform hover:scale-105 shrink-0"
            style={{ backgroundColor: colors.main, color: colors.accent, border: `3px solid ${colors.secondary}`, boxShadow: `0 0 20px ${colors.secondary}66` }}
            title="Вернуться к обзору"
          >
            {/* УВЕЛИЧИЛИ РАЗМЕР СТРЕЛКИ (width и height) */}
            <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </button>

          {character.icon_url && (
            <div className="w-20 h-20 rounded-full overflow-hidden shrink-0" style={{ border: `3px solid ${colors.accent}`, boxShadow: `0 0 20px ${colors.secondary}88` }}>
              <img src={character.icon_url} alt={character.name} className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <h2 className="text-4xl font-bold" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive", textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
              {character.name_ru || character.name}
            </h2>
            <p className="text-sm text-slate-400">Созвездия</p>
          </div>
        </div>

        <div className="text-sm text-slate-400">
          {isSaving ? <span className="text-yellow-400">● Сохранение...</span> : lastSaved ? <span className="text-green-400">✓ Сохранено {lastSaved.toLocaleTimeString().slice(0, 5)}</span> : null}
        </div>
      </div>

      {/* ЦЕНТРАЛЬНАЯ КАРТИНКА */}
      {character.constellation_icon_url && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 flex flex-col items-center opacity-40">
          <img
            src={character.constellation_icon_url}
            alt="Constellation"
            className="w-[45vw] h-[45vw] max-w-[1200px] max-h-[1200px] object-contain"
            style={{ filter: `drop-shadow(0 0 60px ${colors.accent})` }}
          />
        </div>
      )}

      {/* ПРАВАЯ ПАНЕЛЬ: Дуга с кнопками созвездий */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-end z-20" style={{ height: radius * 2.5, width: radius }}>
        {angles.map((angle, index) => {
          const level = index + 1
          const isActive = currentLevel >= level
          const isNext = currentLevel + 1 === level
          const data = consts[String(level)] || {}

          const rad = (angle * Math.PI) / 180
          const x = radius * Math.cos(rad) - radius
          const y = radius * Math.sin(rad)

          return (
            <div
              key={level}
              // ДОБАВИЛИ hover:z-[100] ЧТОБЫ ТУЛТИП БЫЛ ПОВЕРХ ВСЕХ КНОПОК
              className="absolute transition-all duration-300 group hover:z-[100]"
              style={{
                right: 0,
                top: '50%',
                transform: `translate(${x}px, calc(-50% + ${y}px))`,
                zIndex: isActive ? 30 : 20
              }}
            >
              <button
                type="button"
                onClick={() => onUpdate('constellation', currentLevel === level ? level - 1 : level)}
                className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                  isActive ? 'scale-110 shadow-[0_0_30px_rgba(255,255,255,0.4)]' : 'scale-100 opacity-60 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  width: 90, height: 90,
                  backgroundColor: isActive ? colors.main : '#1e293b',
                  border: `4px solid ${isActive ? colors.accent : isNext ? colors.secondary : '#334155'}`,
                }}
              >
                <img
                  src={data.icon || character.constellation_icon_url || '🌟'}
                  alt={`C${level}`}
                  className={`w-full h-full object-cover rounded-full drop-shadow-md ${!isActive && 'grayscale'}`}
                  onError={(e) => { (e.target as HTMLImageElement).src = '🌟'; }}
                />
              </button>

              {/* УБРАЛИ ПРОЗРАЧНОСТЬ (bg-slate-800 вместо bg-slate-800/95) */}
              <div className="
                absolute
                right-[110px]
                top-1/2
                -translate-y-1/2
                w-120
                max-h-[80vh]
                overflow-y-auto
                p-4
                rounded-xl
                bg-slate-800
                border
                border-slate-600
                shadow-2xl
                opacity-0
                pointer-events-none
                group-hover:opacity-100
                group-hover:pointer-events-auto
                transition-opacity
                duration-300
                z-50
                custom-scrollbar
              ">
                <h4 className="font-bold text-lg mb-2" style={{ color: colors.accent }}>
                  {data.name || `Созвездие ${level}`}
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {data.description || 'Описание отсутствует.'}
                </p>
                {level === 3 && character.c3_increases && (
                  <p className="text-xs text-cyan-400 mt-2 font-semibold">Увеличивает: {character.c3_increases} +3</p>
                )}
                {level === 5 && character.c5_increases && (
                  <p className="text-xs text-cyan-400 mt-2 font-semibold">Увеличивает: {character.c5_increases} +3</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-sm animate-pulse pointer-events-none">Прокрути колёсиком или свайпни ↑</div>
    </section>
  )
}
