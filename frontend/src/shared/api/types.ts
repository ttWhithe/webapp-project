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
