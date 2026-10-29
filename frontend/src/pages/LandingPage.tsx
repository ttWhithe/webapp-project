import { Link } from 'react-router-dom'
import { useAuthStore } from '@/shared/lib/auth-store'

export default function LandingPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 overflow-hidden relative select-none">
      {/* Фоновые декорации */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Шапка */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold text-white tracking-wide">Genshin Tracker</div>
        <div>
          {user ? (
            <Link to="/" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/30">
              В личный кабинет
            </Link>
          ) : (
            <Link to="/login" className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg transition-colors">
              Войти
            </Link>
          )}
        </div>
      </header>

      {/* Главный экран (Hero) */}
      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
          <span>✨</span> Умный трекер прогресса
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight max-w-4xl">
          Контролируйте прокачку <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
            ваших персонажей
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12">
          Отслеживайте уровни, таланты, артефакты и созвездия. Смотрите интегральный процент прокачки и планируйте ресурсы эффективно.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {user ? (
            <Link to="/" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-lg transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:-translate-y-1">
              Перейти в трекер
            </Link>
          ) : (
            <>
              <Link to="/register" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-lg transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:-translate-y-1">
                Создать аккаунт
              </Link>
              <Link to="/characters" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl text-lg transition-all hover:-translate-y-1">
                Смотреть каталог
              </Link>
            </>
          )}
        </div>
      </main>

      {/* Блок с фичами */}
      <section className="relative z-10 container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-indigo-500/50 transition-colors">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Интегральный прогресс</h3>
            <p className="text-slate-400 text-sm">Узнайте, насколько эффективно вложены ваши ресурсы в каждого персонажа.</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/50 transition-colors">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-bold text-white mb-2">Полный контроль</h3>
            <p className="text-slate-400 text-sm">Оружие, артефакты, созвездия, таланты — всё в одном месте и всегда под рукой.</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-yellow-500/50 transition-colors">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-bold text-white mb-2">Premium статус</h3>
            <p className="text-slate-400 text-sm">Эксклюзивный дизайн, кастомные иконки и уникальные темы для настоящих ценителей.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
