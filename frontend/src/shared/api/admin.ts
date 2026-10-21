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

  // --- catalog sync + backup ---
  async syncCatalog(): Promise<{
    added: number
    updated: number
    failed: number
    errors: string[]
  }> {
    const { data } = await apiClient.post('/admin/catalog/sync')
    return data
  },

  async downloadBackup(): Promise<Blob> {
    const { data } = await apiClient.get('/admin/catalog/backup', {
      responseType: 'blob',
    })
    return data
  },

  async uploadBackup(file: File): Promise<{
    characters: number
    weapons: number
    artifact_sets: number
  }> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post('/admin/catalog/backup', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async importParser(id: string, file: File): Promise<AdminCharacter> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post<AdminCharacter>(
      `/admin/characters/${id}/import-parser`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  },

  async importWeaponParser(id: string, file: File): Promise<AdminWeapon> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post<AdminWeapon>(
      `/admin/weapons/${id}/import-parser`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } } // <--- ВОТ ЭТОГО НЕ ХВАТАЛО
    )
    return data
  },

  async importArtifactParser(id: string, file: File): Promise<AdminArtifactSet> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post<AdminArtifactSet>(
      `/admin/artifact-sets/${id}/import-parser`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } } // <--- И ТУТ
    )
    return data
  },

  async createCharacter(payload: AdminCharacterCreate): Promise<AdminCharacter> {
    const { data } = await apiClient.post<AdminCharacter>('/admin/characters', payload)
    return data
  },

  async createWeapon(payload: AdminWeaponCreate): Promise<AdminWeapon> {
    const { data } = await apiClient.post<AdminWeapon>('/admin/weapons', payload)
    return data
  },

  async createArtifactSet(payload: AdminArtifactSetCreate): Promise<AdminArtifactSet> {
    const { data } = await apiClient.post<AdminArtifactSet>('/admin/artifact-sets', payload)
    return data
  },

  async deleteCharacter(id: string): Promise<void> {
    await apiClient.delete(`/admin/characters/${id}`)
  },

  async deleteWeapon(id: string): Promise<void> {
    await apiClient.delete(`/admin/weapons/${id}`)
  },

  async deleteArtifactSet(id: string): Promise<void> {
    await apiClient.delete(`/admin/artifact-sets/${id}`)
  },
}
