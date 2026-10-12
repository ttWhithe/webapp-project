import { apiClient } from './client'
import type { ArtifactSet, Character, CharacterListParams, Page, Weapon, WeaponType } from './types'

export const catalogApi = {
  async listCharacters(params: CharacterListParams = {}): Promise<Page<Character>> {
    const { data } = await apiClient.get<Page<Character>>('/characters', { params })
    return data
  },

  async getCharacter(slug: string): Promise<Character> {
    const { data } = await apiClient.get<Character>(`/characters/${slug}`)
    return data
  },

  async listWeapons(
    params: {
      weapon_type?: WeaponType
      rarity?: number
      sort?: 'name_asc' | 'rarity_desc' | 'version_desc'
      limit?: number
      offset?: number
    } = {},
  ): Promise<Page<Weapon>> {
    const { data } = await apiClient.get<Page<Weapon>>('/weapons', { params })
    return data
  },

  async listArtifactSets(): Promise<Page<ArtifactSet>> {
    const { data } = await apiClient.get<Page<ArtifactSet>>('/artifact-sets')
    return data
  },
}
