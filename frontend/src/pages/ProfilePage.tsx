import { useAuthStore } from '@/shared/lib/auth-store'
import { paymentApi } from '@/shared/api/payment'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [error, setError] = useState<string | null>(null)
  const [modalAction, setModalAction] = useState<'donate' | 'subscribe' | null>(null)
  const [provider, setProvider] = useState<'stripe' | 'yookassa'>('stripe')

  const donateMutation = useMutation({
    mutationFn: () => paymentApi.createDonation(500, provider),
    onSuccess: (data) => { window.location.href = data.confirmation_url },
    onError: (err: any) => { setError(err.response?.data?.detail || 'Ошибка создания платежа') }
  })

  const subscribeMutation = useMutation({
    mutationFn: () => paymentApi.createSubscription(provider),
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
                onClick={() => setModalAction('subscribe')}
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
              onClick={() => setModalAction('donate')}
              disabled={isPending}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 border border-slate-500 text-white font-bold rounded-xl transition-all"
            >
              {donateMutation.isPending ? 'Загрузка...' : 'Сделать донат (500 ₽)'}
            </button>
          </div>

        </div>
      </div>

      {/* Модальное окно выбора провайдера */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalAction(null)}>
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6 text-center">Выберите способ оплаты</h3>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setProvider('stripe')
                  modalAction === 'donate' ? donateMutation.mutate() : subscribeMutation.mutate()
                  setModalAction(null)
                }}
                className="flex items-center justify-between w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                <span>Stripe</span>
                <div className="flex items-center gap-1.5">
                  <div className="bg-white rounded px-1 py-1 flex items-center justify-center h-6 w-[42px] shadow-sm">
                    <svg viewBox="0 5.5 24 9" className="w-full h-full fill-[#1434CB]"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/></svg>
                  </div>
                  <div className="bg-white rounded px-1.5 py-1 flex items-center justify-center h-6 w-[42px] shadow-sm">
                    <svg viewBox="0 0 32 20" className="w-full h-full">
                      <circle cx="12" cy="10" r="9" fill="#EB001B"/>
                      <circle cx="20" cy="10" r="9" fill="#F79E1B"/>
                    </svg>
                  </div>
                </div>
              </button>

              <div className="flex flex-col gap-1.5">
                <button
                  disabled
                  title="Временно недоступно. Ведутся технические работы."
                  className="flex items-center justify-between w-full px-5 py-3 bg-slate-800/50 text-slate-400 font-bold rounded-xl border border-slate-700/50 cursor-not-allowed opacity-80"
                >
                  <span>ЮKassa</span>
                  <div className="flex items-center gap-1.5 opacity-60 grayscale">
                    <div className="bg-white rounded px-1.5 py-1 flex items-center justify-center h-6 w-[42px] shadow-sm">
                      <img src="https://logo-teka.com/wp-content/uploads/2025/06/mir-logo.svg" alt="Мир" className="w-full h-full object-contain" />
                    </div>
                    <div className="bg-white rounded px-1.5 py-1 flex items-center justify-center h-6 w-[42px] shadow-sm">
                      <img src="https://logo-teka.com/wp-content/uploads/2025/06/sbp-logo.svg" alt="СБП" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </button>
                <p className="text-xs text-center text-slate-500">
                  * Временно недоступно
                </p>
              </div>
              <button onClick={() => setModalAction(null)} className="mt-2 text-slate-400 hover:text-white text-sm">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
