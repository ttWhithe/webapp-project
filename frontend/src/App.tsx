import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { router } from '@/app/router'
import { authApi } from '@/shared/api/auth'
import { useAuthStore } from '@/shared/lib/auth-store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch((error) => {
        // Если это 401 (токены протухли) — тогда разлогиниваем
        if (error.response?.status === 401) {
          setUser(null)
        } else {
          // Если это 500, 502 или проблема с сетью — не выкидываем пользователя
          // (просто оставляем его залогиненным, если он был)
          console.error('Ошибка при проверке авторизации:', error)
        }
      })
      .finally(() => setLoading(false))
  }, [setUser, setLoading])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
