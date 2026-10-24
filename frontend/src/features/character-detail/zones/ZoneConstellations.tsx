import type { UserCharacterDetail } from '@/shared/api/types'

export function ZoneConstellations({ detail }: { detail: UserCharacterDetail | undefined }) {
  return (
    <section className="h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-3xl font-bold mb-4">Созвездия</h2>
        {detail ? <p className="text-slate-400">Уровень созвездий: <span className="text-yellow-300 font-bold">C{detail.constellation}</span></p> : <p className="text-slate-500">Добавьте персонажа в трекер</p>}
        <p className="text-slate-500 mt-4 text-sm">Детальный разбор созвездий — в следующих версиях.</p>
      </div>
    </section>
  )
}
