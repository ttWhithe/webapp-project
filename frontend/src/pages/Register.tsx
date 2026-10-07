import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authApi } from '@/shared/api/auth'
import { useAuthStore } from '@/shared/lib/auth-store'

export default function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await authApi.register({ email, username, password })
      setUser(user)
      navigate('/')
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Ошибка регистрации'
      setError(detail)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-800 rounded-lg p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">Регистрация</h1>

        {error && (
          <div className="bg-red-900/40 text-red-300 text-sm p-2 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Username</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={50}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Пароль (мин. 8 символов)</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 focus:border-indigo-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-medium"
        >
          {submitting ? 'Создаём...' : 'Зарегистрироваться'}
        </button>

        <p className="text-center text-sm text-slate-400">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  )
}
