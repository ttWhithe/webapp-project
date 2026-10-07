import type { Element, WeaponType } from '@/shared/api/types'

export const ELEMENT_LABELS: Record<Element, string> = {
  pyro: 'Пиро',
  hydro: 'Гидро',
  anemo: 'Анемо',
  electro: 'Электро',
  dendro: 'Дендро',
  cryo: 'Крио',
  geo: 'Гео',
}

// Tailwind-friendly colors for each element
export const ELEMENT_COLORS: Record<Element, string> = {
  pyro: 'bg-red-500/20 text-red-300 border-red-500/40',
  hydro: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  anemo: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  electro: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  dendro: 'bg-green-500/20 text-green-300 border-green-500/40',
  cryo: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  geo: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40',
}

export const WEAPON_TYPE_LABELS: Record<WeaponType, string> = {
  sword: 'Одноручный',
  claymore: 'Двуручный',
  polearm: 'Древковое',
  bow: 'Лук',
  catalyst: 'Катализатор',
}
