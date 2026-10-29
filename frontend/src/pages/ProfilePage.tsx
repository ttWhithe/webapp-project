import { useAuthStore } from '@/shared/lib/auth-store'
import { paymentApi } from '@/shared/api/payment'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [error, setError] = useState<string | null>(null)

  const donateMutation = useMutation({
    mutationFn: () => paymentApi.createDonation(500),
    onSuccess: (data) => { window.location.href = data.confirmation_url },
    onError: (err: any) => { setError(err.response?.data?.detail || 'Ошибка создания платежа') }
  })

  const subscribeMutation = useMutation({
    mutationFn: () => paymentApi.createSubscription(),
    onSuccess: (data) => { window.location.href = data.confirmation_url },
    onError: (err: any) => { setError(err.response?.data?.detail || 'Ошибка создания подписки') }
  })

  if (!user) return null

  const isPending = donateMutation.isPending || subscribeMutation.isPending
  const isPremium = user.role === 'premium'

  return (
    <div className="max-w-4xl mx-auto select-none">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Мой профиль</h1>
        <p className="text-slate-400">Управление аккаунтом и настройками подписки.</p>
      </div>

      {error && (
        <div className="bg-red-900/40 text-red-300 p-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ЛЕВАЯ ПАНЕЛЬ: Инфо */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col items-center text-center shadow-xl">
            <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-inner">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold">{user.username}</h2>
            <p className="text-slate-400 text-sm mb-4">{user.email}</p>

            <div className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 border border-slate-600 text-slate-300">
              Роль: <span className={isPremium ? "text-yellow-400" : "text-indigo-400 uppercase"}>{user.role}</span>
            </div>
            <button
              onClick={() => alert('Редактирование профиля появится в следующих обновлениях!')}
              className="mt-4 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
            >
              Редактировать
            </button>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl text-sm text-slate-400">
            <h3 className="font-bold text-white mb-3">Безопасность</h3>
            <p className="mb-4">Аккаунт защищен паролем. Привязка OAuth (Google/Telegram) появится в следующих обновлениях.</p>
            <Link to="/" className="text-indigo-400 hover:underline">← Вернуться на главную</Link>
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: Донат и Премиум */}
        <div className="md:col-span-2 flex flex-col gap-6">

          {/* Блок Премиум */}
          {isPremium ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/50 p-8 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <div className="absolute -top-10 -right-10 text-9xl opacity-10">✨</div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                Подписка <span className="text-xs bg-emerald-500 px-2 py-0.5 rounded text-white tracking-widest uppercase">Активна</span>
              </h2>
              <p className="text-slate-300 mb-6 max-w-md">
                Спасибо за поддержку проекта! Вам доступны все эксклюзивные темы оформления, кастомные иконки и уникальные анимации.
              </p>
              <button
                onClick={() => alert('Управление подпиской появится в следующих обновлениях!')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold rounded-xl transition-all"
              >
                Управление подпиской
              </button>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/50 p-8 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
              <div className="absolute -top-10 -right-10 text-9xl opacity-10">✨</div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                Genshin Tracker <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded text-white tracking-widest uppercase">Premium</span>
              </h2>
              <p className="text-slate-300 mb-6 max-w-md">
                Получите доступ к эксклюзивным темам оформления, кастомным иконкам персонажей, уникальным анимациям и значкам профиля.
              </p>
              <button
                onClick={() => subscribeMutation.mutate()}
                disabled={isPending}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/50"
              >
                {subscribeMutation.isPending ? 'Загрузка...' : 'Оформить подписку'}
              </button>
            </div>
          )}

          {/* Блок Донат */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-800 border border-slate-700 p-8 shadow-xl">
            <div className="absolute -bottom-8 -right-8 text-8xl opacity-5">🎁</div>
            <h2 className="text-2xl font-bold text-white mb-2">Поддержать проект</h2>
            <p className="text-slate-400 mb-6 max-w-md">
              Если вам нравится трекер и вы хотите помочь с оплатой серверов, вы можете сделать разовый донат любой удобной суммой.
            </p>
            <button
              onClick={() => donateMutation.mutate()}
              disabled={isPending}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 border border-slate-500 text-white font-bold rounded-xl transition-all"
            >
              {donateMutation.isPending ? 'Загрузка...' : 'Сделать донат (500 ₽)'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
