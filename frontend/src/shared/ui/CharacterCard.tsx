import { Link } from 'react-router-dom'

import type { Character } from '@/shared/api/types'
import { ELEMENT_COLORS, ELEMENT_LABELS } from '@/shared/lib/catalog-meta'

interface Props {
  character: Character
}

export default function CharacterCard({ character }: Props) {
  return (
    <Link
      to={`/characters/${character.slug}`}
      className="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition-colors"
    >
      <div className="relative aspect-square bg-slate-900">
        {character.icon_url ? (
          <img
            src={character.icon_url}
            alt={character.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            Нет иконки
          </div>
        )}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-xs">
          {character.rarity}★
        </span>
      </div>

      <div className="p-3">
        <div className="font-medium truncate">{character.name}</div>
        <div
          className={`inline-block mt-2 px-2 py-0.5 rounded text-xs border ${ELEMENT_COLORS[character.element]}`}
        >
          {ELEMENT_LABELS[character.element]}
        </div>
      </div>
    </Link>
  )
}
