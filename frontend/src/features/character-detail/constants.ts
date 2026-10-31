export const ZONES = 4

export const ARTIFACT_MAX_LEVEL: Record<number, number> = {
  1: 4, 2: 4, 3: 12, 4: 16, 5: 20,
}

export const PLACEHOLDER_ICONS: Record<string, string> = {
  flower: '/icons/artifact-slots/flower.svg',
  plume: '/icons/artifact-slots/plume.svg',
  sands: '/icons/artifact-slots/sands.svg',
  goblet: '/icons/artifact-slots/goblet.svg',
  circlet: '/icons/artifact-slots/circlet.svg',
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

// Разрешенные Main Stats для каждого слота
export const ARTIFACT_MAIN_STATS: Record<string, string[]> = {
  flower: ['HP'],
  plume: ['ATK'],
  sands: ['HP%', 'ATK%', 'DEF%', 'Elemental Mastery', 'Energy Recharge'],
  goblet: [
    'HP%', 'ATK%', 'DEF%', 'Elemental Mastery', 'Physical DMG Bonus',
    'Pyro DMG Bonus', 'Hydro DMG Bonus', 'Electro DMG Bonus', 'Cryo DMG Bonus',
    'Anemo DMG Bonus', 'Geo DMG Bonus', 'Dendro DMG Bonus'
  ],
  circlet: ['HP%', 'ATK%', 'DEF%', 'Elemental Mastery', 'CRIT Rate', 'CRIT DMG', 'Healing Bonus'],
}

// Базовые Sub Stats (без бонусов урона и лечения)
export const ARTIFACT_SUB_STATS = [
  'HP', 'ATK', 'DEF',
  'HP%', 'ATK%', 'DEF%',
  'Elemental Mastery', 'Energy Recharge',
  'CRIT Rate', 'CRIT DMG'
]
