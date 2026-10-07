export type Role = 'guest' | 'user' | 'premium' | 'admin'

export interface User {
  id: string
  email: string
  username: string
  role: Role
  avatar_url: string | null
  created_at: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  username: string
  password: string
}

// Catalog types

export type Element =
  | 'pyro'
  | 'hydro'
  | 'anemo'
  | 'electro'
  | 'dendro'
  | 'cryo'
  | 'geo'

export type WeaponType = 'sword' | 'claymore' | 'polearm' | 'bow' | 'catalyst'

export interface Character {
  id: string
  external_id: number
  slug: string
  name: string
  name_ru: string | null
  title: string | null
  element: Element
  weapon_type: WeaponType
  rarity: number
  region: string | null
  birthday: string | null
  icon_url: string | null
  portrait_url: string | null
  version_added: string | null
}

export interface Weapon {
  id: string
  external_id: number
  slug: string
  name: string
  name_ru: string | null
  weapon_type: WeaponType
  rarity: number
  base_atk: number | null
  main_stat: string | null
  icon_url: string | null
  version_added: string | null
}

export interface ArtifactSet {
  id: string
  external_id: number | null
  slug: string
  name: string
  name_ru: string | null
  icon_url: string | null
}

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface CharacterListParams {
  element?: Element
  weapon_type?: WeaponType
  rarity?: number
  sort?: 'name_asc' | 'rarity_desc' | 'version_desc'
  limit?: number
  offset?: number
}

// Tracker types (mirror of backend tracker schemas)

export interface UserCharacterListItem {
  id: string
  character: {
    id: string
    slug: string
    name: string
    name_ru: string | null
    element: Element
    weapon_type: WeaponType
    rarity: number
    icon_url: string | null
    portrait_url: string | null
  }
  level: number
  level_cap: number
  constellation: number
  friendship: number
  crowns_used: number
  progress: number
}

// Admin types

export interface AdminCharacter {
  id: string
  external_id: number
  slug: string
  name: string
  name_ru: string | null
  title: string | null
  element: Element
  weapon_type: WeaponType
  rarity: number
  region: string | null
  birthday: string | null
  icon_url: string | null
  portrait_url: string | null
  version_added: string | null
}

export interface AdminWeapon {
  id: string
  external_id: number
  slug: string
  name: string
  name_ru: string | null
  weapon_type: WeaponType
  rarity: number
  base_atk: number | null
  main_stat: string | null
  icon_url: string | null
  version_added: string | null
}

export interface AdminArtifactSet {
  id: string
  external_id: number | null
  slug: string
  name: string
  name_ru: string | null
  icon_url: string | null
}

export interface AdminCharacterUpdate {
  name_ru?: string | null
  title?: string | null
  rarity?: number
  region?: string | null
  birthday?: string | null
  icon_url?: string | null
  portrait_url?: string | null
  version_added?: string | null
  element?: Element
  weapon_type?: WeaponType
}

export interface AdminWeaponUpdate {
  name_ru?: string | null
  rarity?: number
  icon_url?: string | null
  base_atk?: number | null
  main_stat?: string | null
  version_added?: string | null
}

export interface AdminArtifactSetUpdate {
  name_ru?: string | null
  icon_url?: string | null
}
