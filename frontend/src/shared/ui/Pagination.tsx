interface Props {
  total: number
  limit: number
  offset: number
  onChange: (offset: number) => void
}

export default function Pagination({ total, limit, offset, onChange }: Props) {
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button
        type="button"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - limit))}
        className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
      >
        Назад
      </button>
      <span className="text-sm text-slate-400">
        {page} из {totalPages}
      </span>
      <button
        type="button"
        disabled={offset + limit >= total}
        onClick={() => onChange(offset + limit)}
        className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
      >
        Вперёд
      </button>
    </div>
  )
}
