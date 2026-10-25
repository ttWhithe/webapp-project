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

export interface ConstellationData {
  name: string;
  icon: string;
  description: string;
  increases?: string;
}

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
  constellation_icon_url: string | null;
  constellations: Record<string, ConstellationData> | null;
  c3_increases: string | null;
  c5_increases: string | null;
  talents?: Record<string, any> | null;
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
  version_added: string | null;
  release_date: string | null;
  namecard_url: string | null;
  constellation_icon_url: string | null;
  talents: Record<string, any> | null;
  constellations: Record<string, any> | null;
  c3_increases: string | null;
  c5_increases: string | null;
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
  icon_awakened_url: string | null
  version_added: string | null
  passive_name: string | null;
  passive_desc: string | null;
}

export interface AdminArtifactSet {
  id: string
  external_id: number | null
  slug: string
  name: string
  name_ru: string | null
  icon_url: string | null
  icon_plume_url: string | null
  icon_sands_url: string | null
  icon_goblet_url: string | null
  icon_circlet_url: string | null
  max_rarity: number | null;
  min_rarity: number | null;
  bonus_2pc: string | null;
  bonus_4pc: string | null;
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
  talents?: Record<string, any> | null;
  constellations?: Record<string, any> | null;
}

export interface AdminWeaponUpdate {
  name_ru?: string | null
  rarity?: number
  icon_url?: string | null
  base_atk?: number | null
  main_stat?: string | null
  version_added?: string | null
  icon_awakened_url?: string | null
}

export interface AdminArtifactSetUpdate {
  name_ru?: string | null
  icon_url?: string | null
  icon_plume_url: string | null
  icon_sands_url: string | null
  icon_goblet_url: string | null
  icon_circlet_url: string | null
}

export interface UserArtifact {
  id: string
  slot: 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'
  set_id: string
  set_slug: string
  set_name: string
  rarity: number
  level: number
  main_stat: string | null
  substats: Array<Record<string, unknown>> | null
}

export interface ProgressBreakdown {
  total: number
  level: number
  talents: number
  weapon: number
  artifacts: number
  friendship: number
}

export interface UserCharacterDetail {
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
  friendship: number
  constellation: number
  crowns_used: number
  masterless_stella_fortuna: number
  talent_normal: number
  talent_skill: number
  talent_burst: number
  weapon: {
    id: string
    slug: string
    name: string
    weapon_type: WeaponType
    rarity: number
    icon_url: string | null
  } | null
  weapon_level: number | null
  weapon_refinement: number | null
  artifacts: UserArtifact[]
  custom_icon_url: string | null
  custom_portrait_url: string | null
  custom_background_url: string | null
  custom_hp: number | null
  custom_atk: number | null
  custom_def: number | null
  custom_em: number | null
  custom_crit_rate: number | null
  custom_crit_dmg: number | null
  custom_energy_recharge: number | null
  custom_elemental_dmg_bonus: number | null
  progress: ProgressBreakdown
  created_at: string
  updated_at: string
}

export interface AdminCharacterCreate {
  name: string;
  slug?: string;
  element: string;
  weapon_type: string;
  rarity: number;
}

export interface AdminWeaponCreate {
  name: string;
  slug?: string;
  weapon_type: string;
  rarity: number;
}

export interface AdminArtifactSetCreate {
  name: string;
  slug?: string;
}
