import { apiClient } from './client'
import type { UserCharacterDetail, UserCharacterListItem } from './types'

export const trackerApi = {
  async listMine(): Promise<UserCharacterListItem[]> {
    const { data } = await apiClient.get<UserCharacterListItem[]>('/me/characters')
    return data
  },

  async getMine(id: string): Promise<UserCharacterDetail> {
    const { data } = await apiClient.get<UserCharacterDetail>(`/me/characters/${id}`)
    return data
  },

  async updateMine(
    id: string,
    payload: Partial<{
      level: number
      level_cap: number
      friendship: number
      talent_normal: number
      talent_skill: number
      talent_burst: number
      custom_hp: number | null
      custom_atk: number | null
      custom_def: number | null
      custom_em: number | null
      custom_crit_rate: number | null
      custom_crit_dmg: number | null
      custom_energy_recharge: number | null
      custom_elemental_dmg_bonus: number | null
      weapon_id: string | null
      weapon_level: number | null
      weapon_refinement: number | null
      artifacts: any[]
    }>,
  ): Promise<UserCharacterDetail> {
    const { data } = await apiClient.patch<UserCharacterDetail>(`/me/characters/${id}`, payload)
    return data
  },

  // --- НОВЫЕ МЕТОДЫ ---
  async addMine(character_id: string): Promise<UserCharacterDetail> {
    const { data } = await apiClient.post<UserCharacterDetail>('/me/characters', { character_id })
    return data
  },

  async deleteMine(id: string): Promise<void> {
    await apiClient.delete(`/me/characters/${id}`)
  },
}
