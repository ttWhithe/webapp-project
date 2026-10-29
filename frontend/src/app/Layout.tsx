import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '@/shared/api/auth'
import { useAuthStore } from '@/shared/lib/auth-store'

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const reset = useAuthStore((s) => s.reset)
  const navigate = useNavigate()
  const location = useLocation()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isFullWidth = location.pathname === '/' || /^\/characters\/[^/]+\/?$/.test(location.pathname)

  // Закрываем меню при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-40 select-none">
        <div className="max-w-[95%] mx-auto px-4 h-16 flex items-center justify-between">
          {/* ЛЕВАЯ ЧАСТЬ: Логотип + Кнопка Персонажи */}
          <div className="flex items-center gap-8">
            <Link to="/" className="font-bold text-xl hover:text-indigo-400 transition-colors">
              Genshin Tracker
            </Link>

            <Link
              to="/characters"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]"
            >
              Персонажи
            </Link>
          </div>

          {/* ПРАВАЯ ЧАСТЬ: Админка + Профиль */}
          <nav className="flex items-center gap-6 text-sm">
            {user?.role === 'admin' && <NavItem to="/admin/catalog">Админка</NavItem>}

            {!user && (
              <Link to="/login" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
                Войти
              </Link>
            )}

            {user && (
              <div className="relative pl-4 border-l border-slate-700 flex items-center" ref={menuRef}>
                {/* Кнопка профиля (Аватарка + Имя) */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-3 hover:bg-slate-800 py-1.5 px-3 rounded-lg transition-colors outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white shadow-inner">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-200 font-medium max-w-[150px] truncate">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="bg-gradient-to-r from-red-600 to-rose-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                      ADMIN
                    </span>
                  )}
                  {user.role === 'premium' && (
                    <span className="bg-gradient-to-r from-yellow-500 to-amber-300 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                      PRO
                    </span>
                  )}
                </button>

                {/* Выпадающее меню */}
                {isMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-slate-700/50 mb-1">
                      <p className="text-xs text-slate-400">Вы вошли как</p>
                      <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setIsMenuOpen(false); navigate('/profile'); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Мой профиль
                    </button>
                    <button
                      onClick={() => { setIsMenuOpen(false); navigate('/premium'); }}
                      className="w-full text-left px-4 py-2 text-sm text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 transition-colors font-medium"
                    >
                      Premium подписка
                    </button>
                    <div className="h-px bg-slate-700/50 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className={isFullWidth ? 'w-full px-4 md:px-[4%] py-8' : 'max-w-6xl mx-auto px-4 py-8'}>
        <Outlet />
      </main>
    </div>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `transition-colors ${isActive ? 'text-indigo-400 font-semibold' : 'text-slate-300 hover:text-indigo-400'}`
      }
    >
      {children}
    </NavLink>
  )
}
