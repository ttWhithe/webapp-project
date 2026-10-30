import type { Character } from '@/shared/api/types'

export function getCharacterImage(character: Pick<Character, 'name' | 'icon_url'>, usePremium: boolean): string {
  if (usePremium) {
    // Заменяем пробелы на %20 для корректного URL (Arataki Itto.png -> Arataki%20Itto.png)
    const encodedName = encodeURIComponent(character.name)
    return `/premium/${encodedName}.png`
  }

  return character.icon_url || ''
}
