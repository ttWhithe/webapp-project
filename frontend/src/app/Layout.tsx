import { Link, Outlet, useNavigate } from 'react-router-dom'

import { authApi } from '@/shared/api/auth'
import { useAuthStore } from '@/shared/lib/auth-store'

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const reset = useAuthStore((s) => s.reset)
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await authApi.logout()
    } finally {
      reset()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">
            Genshin Tracker
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/characters" className="hover:text-indigo-400">
              Каталог
            </Link>
            <Link to="/me/characters" className="hover:text-indigo-400">
              Мои персонажи
            </Link>
            {user && (
              <span className="text-slate-500">|</span>
            )}
            {user ? (
              <>
                <span className="text-slate-400">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400"
                >
                  Выйти
                </button>
              </>
            ) : (
              <Link to="/login" className="hover:text-indigo-400">
                Войти
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
