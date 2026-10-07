import { apiClient } from './client'
import type {
  AdminArtifactSet,
  AdminArtifactSetUpdate,
  AdminCharacter,
  AdminCharacterUpdate,
  AdminWeapon,
  AdminWeaponUpdate,
} from './types'

export const adminApi = {
  // --- characters ---
  async listCharacters(limit = 200, offset = 0): Promise<AdminCharacter[]> {
    const { data } = await apiClient.get<AdminCharacter[]>('/admin/characters', {
      params: { limit, offset },
    })
    return data
  },

  async updateCharacter(
    id: string,
    payload: AdminCharacterUpdate,
  ): Promise<AdminCharacter> {
    const { data } = await apiClient.patch<AdminCharacter>(
      `/admin/characters/${id}`,
      payload,
    )
    return data
  },

  // --- weapons ---
  async listWeapons(limit = 200, offset = 0): Promise<AdminWeapon[]> {
    const { data } = await apiClient.get<AdminWeapon[]>('/admin/weapons', {
      params: { limit, offset },
    })
    return data
  },

  async updateWeapon(id: string, payload: AdminWeaponUpdate): Promise<AdminWeapon> {
    const { data } = await apiClient.patch<AdminWeapon>(
      `/admin/weapons/${id}`,
      payload,
    )
    return data
  },

  // --- artifact sets ---
  async listArtifactSets(limit = 200, offset = 0): Promise<AdminArtifactSet[]> {
    const { data } = await apiClient.get<AdminArtifactSet[]>(
      '/admin/artifact-sets',
      { params: { limit, offset } },
    )
    return data
  },

  async updateArtifactSet(
    id: string,
    payload: AdminArtifactSetUpdate,
  ): Promise<AdminArtifactSet> {
    const { data } = await apiClient.patch<AdminArtifactSet>(
      `/admin/artifact-sets/${id}`,
      payload,
    )
    return data
  },
}
