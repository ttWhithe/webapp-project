import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authApi } from '@/shared/api/auth'
import { useAuthStore } from '@/shared/lib/auth-store'

type Tab = 'login' | 'register'

interface AuthPageProps {
  initialTab?: Tab
}

export default function AuthPage({ initialTab = 'login' }: AuthPageProps) {
  const [tab, setTab] = useState<Tab>(initialTab)

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  function switchTab(next: Tab) {
    setTab(next)
    setError(null)
    setEmail('')
    setUsername('')
    setPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const user =
        tab === 'login'
          ? await authApi.login({ email, password })
          : await authApi.register({ email, username, password })

      setUser(user)
      navigate('/')
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Что-то пошло не так'
      setError(typeof detail === 'string' ? detail : 'Ошибка валидации')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="block text-center text-2xl font-bold mb-8 text-slate-100 hover:text-indigo-400"
        >
          Genshin Tracker
        </Link>

        <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900 rounded-lg p-1 mb-6">
            <TabButton active={tab === 'login'} onClick={() => switchTab('login')}>
              Вход
            </TabButton>
            <TabButton active={tab === 'register'} onClick={() => switchTab('register')}>
              Регистрация
            </TabButton>
          </div>

          {/* OAuth circle buttons */}
          <div className="flex justify-center gap-4 mb-6">
            <OAuthButton label="Google" disabled title="Скоро">
              <GoogleIcon />
            </OAuthButton>
            <OAuthButton label="Telegram" disabled title="Скоро">
              <TelegramIcon />
            </OAuthButton>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 uppercase">или</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-900/40 text-red-300 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {tab === 'register' && (
              <InputWithIcon
                icon={<UserIcon />}
                type="text"
                placeholder="Username"
                value={username}
                onChange={setUsername}
                minLength={3}
                maxLength={50}
                required
              />
            )}

            <InputWithIcon
              icon={<MailIcon />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              required
            />

            <InputWithIcon
              icon={<LockIcon />}
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={setPassword}
              minLength={8}
              required
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {submitting
                ? 'Подождите...'
                : tab === 'login'
                  ? 'Войти'
                  : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            {tab === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              type="button"
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              className="text-indigo-400 hover:underline"
            >
              {tab === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------- Small presentational helpers ---------- */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function OAuthButton({
  children,
  label,
  disabled,
  title,
}: {
  children: React.ReactNode
  label: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      title={title}
      className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

function InputWithIcon({
  icon,
  ...inputProps
}: {
  icon: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement> & {
    value: string
    onChange: (value: string) => void
  }) {
  const { value, onChange, ...rest } = inputProps
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
        {icon}
      </div>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-11 pr-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
      />
    </div>
  )
}

/* ---------- Icons (inline, no extra deps) ---------- */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <path
        d="M30 16.31c0-1.15-.1-1.99-.3-2.86H16.29v5.2h7.87c-.16 1.29-1.02 3.23-2.92 4.54l-.03.18 4.24 3.21.29.03c2.7-2.44 4.26-6.04 4.26-10.3z"
        fill="#4285F4"
      />
      <path
        d="M16.29 30c3.86 0 7.1-1.25 9.46-3.4l-4.51-3.43c-1.21.83-2.83 1.4-4.95 1.4-3.78 0-6.99-2.44-8.13-5.82l-.17.01-4.41 3.35-.06.16c2.35 4.57 7.17 7.72 12.77 7.72z"
        fill="#34A853"
      />
      <path
        d="M8.16 18.77a8.6 8.6 0 0 1-.48-2.77c0-.97.17-1.9.46-2.77l-.01-.18L3.67 9.65l-.14.07A13.9 13.9 0 0 0 2 16c0 2.25.56 4.39 1.52 6.28l4.64-3.51z"
        fill="#FBBC05"
      />
      <path
        d="M16.29 7.41c2.68 0 4.49 1.14 5.52 2.09l4.03-3.86A13.5 13.5 0 0 0 16.29 2 13.99 13.99 0 0 0 3.53 9.72l4.62 3.51c1.16-3.38 4.36-5.82 8.14-5.82z"
        fill="#EB4335"
      />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="#229ED9" />
      <path
        d="M22.6 10.1 10.9 14.6c-.8.3-.8 1.4.1 1.6l3 .9 1.1 3.5c.2.7 1.1.9 1.6.3l1.7-2 3 .2c.6 0 1-.5 1.1-1l1.6-6.9c.1-.7-.5-1.3-1.5-1.1z"
        fill="#fff"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-6 2.7-6 6v2h12v-2c0-3.3-2.7-6-6-6z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-10h-1V5a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM8 5a4 4 0 0 1 8 0v2H8V5z" />
    </svg>
  )
}
