export const ZONES = 4

export const MAIN_STATS = [
  'HP', 'ATK', 'HP%', 'ATK%', 'DEF%', 'Elemental Mastery', 'Energy Recharge',
  'CRIT Rate', 'CRIT DMG', 'Healing Bonus', 'Physical DMG Bonus',
  'Pyro DMG Bonus', 'Hydro DMG Bonus', 'Dendro DMG Bonus', 'Electro DMG Bonus',
  'Anemo DMG Bonus', 'Cryo DMG Bonus', 'Geo DMG Bonus'
]

export const SUB_STATS = [
  'HP', 'ATK', 'DEF', 'HP%', 'ATK%', 'DEF%', 'Elemental Mastery',
  'Energy Recharge', 'CRIT Rate', 'CRIT DMG'
]

export const ARTIFACT_MAX_LEVEL: Record<number, number> = {
  1: 4, 2: 4, 3: 12, 4: 16, 5: 20,
}

export const PLACEHOLDER_ICONS: Record<string, string> = {
  flower: 'https://static.wikia.nocookie.net/gensin-impact/images/2/2d/Icon_Flower_of_Life.png',
  plume: 'https://static.wikia.nocookie.net/gensin-impact/images/8/8b/Icon_Plume_of_Death.png',
  sands: 'https://static.wikia.nocookie.net/gensin-impact/images/9/9f/Icon_Sands_of_Eon.png',
  goblet: 'https://static.wikia.nocookie.net/gensin-impact/images/3/37/Icon_Goblet_of_Eonothem.png',
  circlet: 'https://static.wikia.nocookie.net/gensin-impact/images/6/64/Icon_Circlet_of_Logos.png',
}

export type EquipmentSlotKey = 'weapon' | 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'

export const EQUIPMENT_SLOTS: { key: EquipmentSlotKey; icon: string; label: string }[] = [
  { key: 'weapon', icon: '⚔️', label: 'Оружие' },
  { key: 'flower', icon: '🌸', label: 'Цветок' },
  { key: 'plume', icon: '🪶', label: 'Перо' },
  { key: 'sands', icon: '⏳', label: 'Часы' },
  { key: 'goblet', icon: '🏺', label: 'Кубок' },
  { key: 'circlet', icon: '👑', label: 'Шапка' },
]
