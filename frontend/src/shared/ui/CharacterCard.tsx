import { Link } from 'react-router-dom'

import type { Character } from '@/shared/api/types'
import {
  ELEMENT_HEX,
  ELEMENT_LABELS,
  getRarityBackground,
} from '@/shared/lib/catalog-meta'
import { useSettingsStore } from '@/shared/lib/settings-store'
import { getCharacterImage } from '@/shared/lib/image-utils'
import CircularProgress from './CircularProgress'
import ElementIcon from './ElementIcon'

// Локальные пути к картинкам
const CROWN_ICON_URL = '/icons/ui/crown.png'
const CONSTELLATION_STAR_URL = '/icons/ui/constellation_star.svg'

function getNamePlateColors(rarity: number, owned: boolean) {
  const five = rarity === 5
  if (owned) {
    return {
      backgroundColor: five ? '#fde68a' : '#ddd6fe',
      color: five ? '#713f12' : '#4c1d95',
    }
  }
  return {
    backgroundColor: five ? '#fef3c7' : '#ede9fe',
    color: five ? '#a16207' : '#6d28d9',
  }
}

interface Props {
  character: Character
  progress?: number
  level?: number
  crowns?: number
  constellation?: number
}

export default function CharacterCard({
  character,
  progress,
  level,
  crowns = 0,
  constellation = 0,
}: Props) {
  const { usePremiumImages } = useSettingsStore()
  const owned = progress !== undefined
  const colors = ELEMENT_HEX[character.element]
  const bgUrl = getRarityBackground(character.rarity, character.slug)
  const namePlate = getNamePlateColors(character.rarity, owned)

  const imageUrl = getCharacterImage(character, usePremiumImages)

  return (
    <Link
      to={`/characters/${character.slug}`}
      className="group relative block rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition-colors bg-slate-800"
    >
      <div
        className="px-1.5 py-1 text-center truncate text-sm font-semibold"
        style={{
          fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
          backgroundColor: namePlate.backgroundColor,
          color: namePlate.color,
        }}
      >
        {character.name_ru || character.name}
      </div>

      <div className="relative aspect-square overflow-hidden bg-slate-900">
        {bgUrl && (
          <div
            className={`absolute inset-0 bg-cover bg-center ${
              owned ? '' : 'grayscale opacity-40'
            }`}
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt={character.name}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
              owned ? '' : 'grayscale'
            }`}
          />
        )}

        {/* Element badge (top-left) */}
        <div
          className="absolute top-0.5 left-0.5 w-10 h-10 flex items-center justify-center pointer-events-none"
          title={ELEMENT_LABELS[character.element]}
        >
          <div
            className="absolute inset-1 rounded-full blur-[6px] opacity-70"
            style={{ backgroundColor: colors.main }}
          />

          <ElementIcon
            element={character.element}
            className="relative z-10 w-9 h-9"
            color={colors.main}
            outlineColor={colors.secondary}
            outlineWidth={0.4}
            glowColor={colors.secondary}
          />
        </div>

        {/* Constellation (top-right) */}
        {owned && (
          <div className="absolute top-0 right-0 w-10 h-10">
            <img
              src={CONSTELLATION_STAR_URL}
              alt="Constellation"
              className="w-full h-full drop-shadow-[0_0_5px_rgba(253,224,71,0.95)]"
            />
            <span
              className="absolute inset-0 flex items-center justify-center text-lg font-bold text-yellow-400 pt-0.5"
              style={{
                textShadow: '0 0 3px #000, 0 0 1px #000',
                fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
              }}
            >
              {constellation}
            </span>
          </div>
        )}

        {/* Crowns (bottom-left) */}
        {owned && (
          <div className="absolute bottom-0 left-0 w-12 h-12 flex items-center justify-center">
            <img
              src={CROWN_ICON_URL}
              alt="crowns"
              className="w-10 h-10 drop-shadow-[0_0_5px_rgba(253,224,71,0.95)]"
            />
            <span
              className="absolute text-lg font-bold text-yellow-400 pt-0.5"
              style={{
                textShadow: '0 0 3px #000, 0 0 1px #000',
                fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
              }}
            >
              {crowns}
            </span>
          </div>
        )}

        {/* Progress circle (bottom-right) */}
        {owned && (
          <div className="absolute bottom-0.5 right-0.5">
            <CircularProgress
              value={progress}
              size={40}
              strokeWidth={5}
              fillColor={colors.secondary}
              emptyColor={colors.main}
              innerColor={colors.main}
              borderColor={colors.secondary}
              textColor={colors.secondary}
            />
          </div>
        )}
      </div>

      <div
        className={`px-1.5 py-1 text-center text-base font-bold leading-tight ${
          owned ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-slate-500'
        }`}
        style={{ fontFamily: "'Consolas', 'Monaco', monospace" }}
      >
        {owned && level !== undefined ? `lvl.${level}` : '—'}
      </div>
    </Link>
  )
}
