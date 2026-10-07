import { useAuthStore } from '@/shared/lib/auth-store'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Привет, {user?.username}!
      </h1>
      <p className="text-slate-400 mb-6">
        Роль: {user?.role}. Это дашборд. Каталог и трекер появятся в следующих итерациях.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Каталог</div>
          <div className="text-2xl font-bold mt-1">119 персонажей</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Оружие</div>
          <div className="text-2xl font-bold mt-1">253</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Сеты артефактов</div>
          <div className="text-2xl font-bold mt-1">63</div>
        </div>
      </div>
    </div>
  )
}
