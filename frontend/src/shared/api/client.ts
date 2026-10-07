import axios, { type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/shared/lib/auth-store'

// Base URL of the backend API. withCredentials is required so that httpOnly
// cookies (access_token, refresh_token) are sent with every request.
export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- Automatic token refresh on 401 -----------------------------------------

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

// Endpoints that must NOT trigger the refresh flow — otherwise we'd loop.
function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/logout')
  )
}

// Guard so that N concurrent 401s trigger only ONE refresh call.
let isRefreshing = false
// Other requests wait here while the refresh is in flight.
let pendingQueue: Array<(ok: boolean) => void> = []

function flushQueue(ok: boolean) {
  const queue = pendingQueue
  pendingQueue = []
  queue.forEach((resolve) => resolve(ok))
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const err = error as {
      config?: RetryableConfig
      response?: { status?: number }
    }
    const original = err.config
    const status = err.response?.status
    const url = original?.url ?? ''

    // Not a 401, or a 401 on auth endpoints — pass through.
    if (status !== 401 || !original || isAuthEndpoint(url)) {
      return Promise.reject(error)
    }

    // We already tried to retry this one — avoid infinite loop.
    if (original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    // If another request is already refreshing, wait for it.
    if (isRefreshing) {
      const ok = await new Promise<boolean>((resolve) => {
        pendingQueue.push(resolve)
      })
      if (!ok) return Promise.reject(error)
      return apiClient(original)
    }

    // We're the "leader" — perform the refresh.
    isRefreshing = true
    try {
      await apiClient.post('/auth/refresh')
      flushQueue(true)
      return apiClient(original)
    } catch (refreshError) {
      flushQueue(false)
      // Refresh failed → clear local auth state. ProtectedRoute will redirect.
      useAuthStore.getState().reset()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
