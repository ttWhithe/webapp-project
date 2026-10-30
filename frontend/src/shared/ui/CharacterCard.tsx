import { Link } from 'react-router-dom'

import type { Character } from '@/shared/api/types'
import {
  ELEMENT_EMOJI,
  ELEMENT_HEX,
  ELEMENT_LABELS,
  getRarityBackground,
} from '@/shared/lib/catalog-meta'
import { useSettingsStore } from '@/shared/lib/settings-store'
import { getCharacterImage } from '@/shared/lib/image-utils'
import CircularProgress from './CircularProgress'

const CROWN_ICON_URL =
  'https://static.wikia.nocookie.net/gensin-impact/images/0/04/Item_Crown_of_Insight.png'

function ConstellationStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 800" className={className} aria-hidden="true">
      <path
        d="M400,100l47.7,177.1c5.8,21.6,8.7,32.4,14.5,41.2,5.1,7.8,11.7,14.5,19.6,19.6,8.8,5.7,19.6,8.6,41.2,14.5l177.1,47.7-177.1,47.7c-21.6,5.8-32.4,8.7-41.2,14.5-7.8,5.1-14.5,11.7-19.6,19.6-5.7,8.8-8.6,19.6-14.5,41.2l-47.7,177.1-47.7-177.1c-5.8-21.6-8.7-32.4-14.5-41.2-5.1-7.8-11.7-14.5-19.6-19.6-8.8-5.7-19.6-8.6-41.2-14.5l-177.1-47.7,177.1-47.7c21.6-5.8,32.4-8.7,41.2-14.5,7.8-5.1,14.5-11.7,19.6-19.6,5.7-8.8,8.6-19.6,14.5-41.2l47.7-177.1h0Z"
        fill="#fde047"
      />
    </svg>
  )
}

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
  const { usePremiumImages } = useSettingsStore() // <--- ДОБАВИЛИ
  const owned = progress !== undefined
  const colors = ELEMENT_HEX[character.element]
  const bgUrl = getRarityBackground(character.rarity, character.slug)
  const namePlate = getNamePlateColors(character.rarity, owned)

  // Получаем нужную картинку
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

        {/* ... Остальной код без изменений (Element badge, Constellation, Crowns, Progress) ... */}
        <div
          className="absolute top-1 left-1 w-7 h-7 rounded-full flex items-center justify-center text-sm"
          style={{
            backgroundColor: `${colors.main}55`,
            border: `1.5px solid ${colors.accent}`,
            boxShadow: `0 0 10px ${colors.main}99`,
          }}
          title={ELEMENT_LABELS[character.element]}
        >
          <span className="leading-none">{ELEMENT_EMOJI[character.element]}</span>
        </div>

        {owned && (
          <div className="absolute top-0 right-0 w-10 h-10">
            <ConstellationStar className="w-full h-full drop-shadow-[0_0_5px_rgba(253,224,71,0.95)]" />
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
