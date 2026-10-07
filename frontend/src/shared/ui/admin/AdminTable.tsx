interface Column<T> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
  className?: string
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
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`text-left px-3 py-2 font-medium ${c.className ?? ''}`}
                >
                  {c.label}
                </th>
              ))}
              <th className="text-right px-3 py-2 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-t border-slate-700 hover:bg-slate-700/40"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 align-middle ${c.className ?? ''}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => onEdit(row)}
                    className="text-xs px-2 py-1 rounded bg-indigo-600/60 hover:bg-indigo-600"
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
