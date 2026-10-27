export function CharacterToggleButton({ isOwned, onClick, colors }: { isOwned: boolean, onClick: () => void, colors: any }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation() // Защита от случайных кликов
        onClick()
      }}
      title={isOwned ? "Удалить персонажа из трекера" : "Добавить персонажа в трекер"}
      className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer relative overflow-hidden ${
        isOwned ? 'grayscale' : ''
      }`}
      style={{
        backgroundColor: colors.secondary,
        border: `3px solid ${colors.main}`,
        boxShadow: `0 0 15px ${colors.main}88`
      }}
    >
      {/* Тот самый блюр внутри */}
      <div className="absolute inset-[15%] rounded-full opacity-60 filter blur-[4px]" style={{ backgroundColor: colors.main }} />

      {/* Временные иконки (потом заменим на SVG) */}
      <span className="relative z-10 text-2xl drop-shadow-md text-white font-bold">
        {isOwned ? '✖' : '＋'}
      </span>
    </button>
  )
}
