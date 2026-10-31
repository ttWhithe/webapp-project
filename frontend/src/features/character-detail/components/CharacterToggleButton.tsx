import ElementIcon from '@/shared/ui/ElementIcon'
import type { Element } from '@/shared/api/types'

export function CharacterToggleButton({ isOwned, onClick, colors, element }: { isOwned: boolean, onClick: () => void, colors: any, element: Element }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
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
      <div className="absolute inset-[15%] rounded-full opacity-60 filter blur-[4px]" style={{ backgroundColor: colors.main }} />

      <div className="relative z-10 w-3/5 h-3/5 flex items-center justify-center">
         <ElementIcon
           element={element}
           className="w-full h-full"
           color={colors.main}
           outlineColor={colors.secondary}
           outlineWidth={0.8}
           glowColor={colors.secondary}
         />
      </div>
    </button>
  )
}
