import { Link } from 'react-router-dom'

import type { Character } from '@/shared/api/types'
import {
  ELEMENT_EMOJI,
  ELEMENT_HEX,
  ELEMENT_LABELS,
  getRarityBackground,
  getRarityLabel,
} from '@/shared/lib/catalog-meta'
import CircularProgress from './CircularProgress'

interface Props {
  character: Character
  // Undefined if user hasn't tracked this character yet
  progress?: number
  level?: number
  crowns?: number
}

export default function CharacterCard({
  character,
  progress,
  level,
  crowns = 0,
}: Props) {
  const owned = progress !== undefined
  const colors = ELEMENT_HEX[character.element]
  const bgUrl = getRarityBackground(character.rarity, character.slug)
  const rarityLabel = getRarityLabel(character.rarity, character.slug)

  return (
    <Link
      to={`/characters/${character.slug}`}
      className="group relative block rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition-all bg-slate-800"
      style={
        {
          '--el-main': colors.main,
          '--el-secondary': colors.secondary,
          '--el-accent': colors.accent,
        } as React.CSSProperties
      }
    >
      {/* Name plate (top) */}
      <div className="bg-slate-100 text-slate-900 px-2 py-1.5 text-center">
        <div className="text-sm font-semibold truncate">
          {character.name_ru || character.name}
        </div>
      </div>

      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-slate-900">
        {/* Rarity background */}
        {bgUrl && (
          <div
            className={`absolute inset-0 bg-cover bg-center transition-opacity ${
              owned ? '' : 'grayscale opacity-40'
            }`}
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
        )}

        {/* Character icon */}
        {character.icon_url && (
          <img
            src={character.icon_url}
            alt={character.name}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
              owned ? '' : 'grayscale'
            }`}
          />
        )}

        {/* Element badge (top-left) — always colored */}
        <div
          className="absolute top-1.5 left-1.5 w-8 h-8 rounded-full flex items-center justify-center text-base backdrop-blur-sm"
          style={{
            backgroundColor: `${colors.main}55`,
            border: `1.5px solid ${colors.accent}`,
            boxShadow: `0 0 12px ${colors.main}99`,
          }}
          title={ELEMENT_LABELS[character.element]}
        >
          <span>{ELEMENT_EMOJI[character.element]}</span>
        </div>

        {/* Rarity (top-right) */}
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/65 text-yellow-300 text-xs font-bold">
          ★{rarityLabel}
        </div>

        {/* Crowns (bottom-left) — only if owned and > 0 */}
        {owned && crowns > 0 && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-yellow-300 text-xs font-bold flex items-center gap-0.5">
            <span>👑</span>
            <span>{crowns}</span>
          </div>
        )}

        {/* Progress circle (bottom-right) — only if owned */}
        {owned && (
          <div className="absolute bottom-1.5 right-1.5">
            <CircularProgress
              value={progress}
              size={40}
              strokeWidth={3.5}
              color={colors.accent}
              trackColor="rgba(0,0,0,0.6)"
            />
          </div>
        )}
      </div>

      {/* Level plate (bottom) */}
      <div
        className={`px-2 py-1.5 text-center text-sm font-bold ${
          owned ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-slate-500'
        }`}
      >
        {owned && level !== undefined ? `Ур. ${level}` : '—'}
      </div>
    </Link>
  )
}
