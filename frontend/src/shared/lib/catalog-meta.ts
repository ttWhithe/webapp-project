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

export const ELEMENT_COLORS: Record<Element, string> = {
  pyro: 'bg-red-500/20 text-red-300 border-red-500/40',
  hydro: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  anemo: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  electro: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  dendro: 'bg-green-500/20 text-green-300 border-green-500/40',
  cryo: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  geo: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40',
}

export const ELEMENT_EMOJI: Record<Element, string> = {
  pyro: '🔥',
  hydro: '💧',
  anemo: '🌀',
  electro: '⚡',
  dendro: '🌿',
  cryo: '❄️',
  geo: '🪨',
}

export const ELEMENT_HEX: Record<
  Element,
  { main: string; secondary: string; accent: string }
> = {
  pyro: { main: '#ef4444', secondary: '#7f1d1d', accent: '#fca5a5' },
  hydro: { main: '#3b82f6', secondary: '#1e3a8a', accent: '#93c5fd' },
  anemo: { main: '#14b8a6', secondary: '#134e4a', accent: '#5eead4' },
  electro: { main: '#a855f7', secondary: '#581c87', accent: '#d8b4fe' },
  dendro: { main: '#22c55e', secondary: '#14532d', accent: '#86efac' },
  cryo: { main: '#06b6d4', secondary: '#164e63', accent: '#67e8f9' },
  geo: { main: '#eab308', secondary: '#713f12', accent: '#fde047' },
}

export const WEAPON_TYPE_LABELS: Record<WeaponType, string> = {
  sword: 'Одноручный',
  claymore: 'Двуручный',
  polearm: 'Древковое',
  bow: 'Лук',
  catalyst: 'Катализатор',
}

// Rarity background images (from Genshin Wikia)
const RARITY_BG_MAP: Record<number, string> = {
  1: 'https://static.wikia.nocookie.net/gensin-impact/images/c/c2/Background_Item_1_Star.png',
  2: 'https://static.wikia.nocookie.net/gensin-impact/images/2/2e/Background_Item_2_Star.png',
  3: 'https://static.wikia.nocookie.net/gensin-impact/images/2/20/Background_Item_3_Star.png',
  4: 'https://static.wikia.nocookie.net/gensin-impact/images/e/ec/Background_Item_4_Star.png',
  5: 'https://static.wikia.nocookie.net/gensin-impact/images/7/76/Background_Item_5_Star.png',
}

// Special "5a" background — for Traveler and Aloy
const RARITY_BG_5A =
  'https://static.wikia.nocookie.net/gensin-impact/images/d/de/Background_Item_5a_Star.png'

// Slugs that should use the special 5a background
const SPECIAL_5A_SLUGS = new Set(['aloy'])
const SPECIAL_5A_PREFIXES = ['traveler-', 'traveler_']

/**
 * Get the rarity background image URL for a character.
 * Returns the special 5a background for Traveler variants and Aloy.
 */
export function getRarityBackground(
  rarity: number,
  slug?: string,
): string | null {
  if (slug) {
    const lower = slug.toLowerCase()
    if (
      SPECIAL_5A_SLUGS.has(lower) ||
      SPECIAL_5A_PREFIXES.some((p) => lower.startsWith(p))
    ) {
      return RARITY_BG_5A
    }
  }
  return RARITY_BG_MAP[rarity] ?? null
}

/**
 * Display label for rarity. "5a" for the special cases, otherwise "5".
 */
export function getRarityLabel(rarity: number, slug?: string): string {
  if (slug) {
    const lower = slug.toLowerCase()
    if (
      SPECIAL_5A_SLUGS.has(lower) ||
      SPECIAL_5A_PREFIXES.some((p) => lower.startsWith(p))
    ) {
      return '5a'
    }
  }
  return String(rarity)
}
