import { apiClient } from './client'
import type { UserCharacterListItem } from './types'

export const trackerApi = {
  async listMine(): Promise<UserCharacterListItem[]> {
    const { data } = await apiClient.get<UserCharacterListItem[]>(
      '/me/characters',
    )
    return data
  },
}
