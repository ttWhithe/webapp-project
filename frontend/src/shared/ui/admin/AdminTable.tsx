import { useMemo, useState } from 'react'

interface Column<T> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
  className?: string
  sortValue?: (row: T) => string | number | null | undefined
  sortable?: boolean // <--- Новый флаг
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  onEdit: (row: T) => void
  rowKey: (row: T) => string
}

export default function AdminTable<T>({
  rows,
  columns,
  onEdit,
  rowKey,
}: Props<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const handleSort = (key: string, sortable: boolean = true) => {
    if (!sortable) return // Блокируем сортировку, если указано sortable: false

    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' }
        return null
      }
      return { key, direction: 'asc' }
    })
  }

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows

    const { key, direction } = sortConfig
    const col = columns.find((c) => c.key === key)

    return [...rows].sort((a, b) => {
      const aVal = col?.sortValue ? col.sortValue(a) : (a as any)[key]
      const bVal = col?.sortValue ? col.sortValue(b) : (b as any)[key]

      if (aVal === null || aVal === undefined || aVal === '') return 1
      if (bVal === null || bVal === undefined || bVal === '') return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortConfig, columns])

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              {columns.map((c) => {
                const isSortable = c.sortable !== false
                return (
                  <th
                    key={c.key}
                    onClick={() => handleSort(c.key, isSortable)}
                    className={`text-left px-3 py-2 font-medium select-none transition-colors ${
                      isSortable ? 'cursor-pointer hover:bg-slate-800' : 'cursor-default'
                    } ${c.className ?? ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {c.label}
                      {isSortable && sortConfig?.key === c.key && (
                        <span className="text-indigo-400 text-[10px]">
                          {sortConfig.direction === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
              <th className="sticky right-0 z-10 bg-slate-900 text-right px-3 py-2 font-medium border-l border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.3)]">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-t border-slate-700 hover:bg-slate-700/40 group"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 align-middle ${c.className ?? ''}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
                <td className="sticky right-0 z-10 bg-slate-800 group-hover:bg-[#303d54] px-3 py-2 text-right border-l border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.3)]">
                  {/* Кнопка теперь строго в центре ячейки и перехватывает клики только на себя */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation() // Защита от случайных кликов по строке
                      onEdit(row)
                    }}
                    className="text-xs px-3 py-1.5 rounded bg-indigo-600/60 hover:bg-indigo-600 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Ред.
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
