import { apiClient } from './client'
import type { UserCharacterDetail, UserCharacterListItem } from './types'

export const trackerApi = {
  async listMine(): Promise<UserCharacterListItem[]> {
    const { data } = await apiClient.get<UserCharacterListItem[]>(
      '/me/characters',
    )
    return data
  },

  async getMine(id: string): Promise<UserCharacterDetail> {
    const { data } = await apiClient.get<UserCharacterDetail>(
      `/me/characters/${id}`,
    )
    return data
  },

}
