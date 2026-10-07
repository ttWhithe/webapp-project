import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/shared/lib/auth-store'

export default function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        Загрузка...
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
