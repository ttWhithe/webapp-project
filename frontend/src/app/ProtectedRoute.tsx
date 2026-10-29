import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/shared/lib/auth-store'

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        Загрузка...
      </div>
    )
  }

  if (!user) {
    // Вместо /login кидаем на /welcome (Landing Page)
    return <Navigate to="/welcome" state={{ from: location }} replace />
  }

  return <Outlet />
}
