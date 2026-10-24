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
  const angles = [-70, -42, -14, 14, 42, 70];
  const radius = 280;

  return (
    <section className="h-screen relative overflow-hidden" style={{ background: `radial-gradient(ellipse at center, ${colors.secondary}40 0%, #0f172a 70%)` }}>

      <div className="absolute left-12 top-1/2 -translate-y-1/2 flex flex-col items-start z-10 w-[400px]">
        {character.icon_url && (
          <div className="w-48 h-48 rounded-full overflow-hidden mb-6" style={{ border: `4px solid ${colors.accent}`, boxShadow: `0 0 40px ${colors.secondary}88` }}>
            <img src={character.icon_url} alt={character.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive", textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
          {character.name_ru || character.name}
        </h2>
        <p className="text-xl text-slate-300 mb-8">Созвездия: <span className="font-bold text-yellow-400 text-2xl ml-2">C{currentLevel}</span></p>

        <button
          type="button"
          onClick={() => goTo(0)}
          className="px-8 py-4 rounded-2xl font-bold text-lg transition-transform hover:scale-105"
          style={{ backgroundColor: colors.main, color: colors.accent, border: `2px solid ${colors.secondary}`, boxShadow: `0 0 20px ${colors.secondary}66` }}
        >
          Вернуться к обзору
        </button>

        <div className="mt-8 text-sm text-slate-400">
          {isSaving ? <span className="text-yellow-400">● Сохранение...</span> : lastSaved ? <span className="text-green-400">✓ Сохранено {lastSaved.toLocaleTimeString().slice(0, 5)}</span> : null}
        </div>
      </div>

      {/* Прижато к правому краю с помощью абсолютного позиционирования */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-end" style={{ height: radius * 2.5, width: radius }}>
        {angles.map((angle, index) => {
          const level = index + 1
          const isActive = currentLevel >= level
          const isNext = currentLevel + 1 === level

          const rad = (angle * Math.PI) / 180
          // Вычисляем отступ слева и сверху от центра дуги
          const x = radius * Math.cos(rad) - radius // Отрицательное значение, сдвигает влево
          const y = radius * Math.sin(rad)

          return (
            <div
              key={level}
              className="absolute transition-all duration-300 group"
              style={{
                right: 0,
                top: '50%',
                transform: `translate(${x}px, calc(-50% + ${y}px))`,
                zIndex: isActive ? 20 : 10
              }}
            >
              <button
                type="button"
                onClick={() => onUpdate('constellation', currentLevel === level ? level - 1 : level)}
                className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                  isActive ? 'scale-110' : 'scale-100 opacity-60 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  width: 90, height: 90,
                  backgroundColor: isActive ? colors.main : '#1e293b',
                  border: `4px solid ${isActive ? colors.accent : isNext ? colors.secondary : '#334155'}`,
                  boxShadow: isActive ? `0 0 30px ${colors.accent}88` : 'none',
                }}
              >
                <img
                  src={character.constellation_icon_url || '🌟'}
                  alt={`C${level}`}
                  className={`w-14 h-14 object-contain drop-shadow-md ${!isActive && 'grayscale'}`}
                  onError={(e) => { (e.target as HTMLImageElement).src = '🌟'; }}
                />
              </button>

              <div className="absolute right-[110px] top-1/2 -translate-y-1/2 w-72 p-4 rounded-xl bg-slate-800/95 border border-slate-600 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300 z-50">
                <h4 className="font-bold text-lg mb-2" style={{ color: colors.accent }}>Созвездие {level}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {level === 3 && character.c3_increases ? `Увеличивает уровень: ${character.c3_increases} на +3` :
                   level === 5 && character.c5_increases ? `Увеличивает уровень: ${character.c5_increases} на +3` :
                   'Описание созвездия (будет загружено из БД в следующих обновлениях).'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-sm animate-pulse pointer-events-none">Прокрути колёсиком или свайпни ↑</div>
    </section>
  )
}
