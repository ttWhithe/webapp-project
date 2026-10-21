import { useEffect, useState } from 'react'

interface FieldConfig {
  key: string
  label: string
  type?: 'text' | 'number' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
}

interface Props {
  title: string
  fields: FieldConfig[]
  initialValues: Record<string, unknown>
  submitting: boolean
  errorMessage: string | null
  onSave: (values: Record<string, unknown>) => void
  onClose: () => void
  onImport?: (file: File) => void
  onDelete?: () => void
}

export default function AdminEditModal({
  title,
  fields,
  initialValues,
  submitting,
  errorMessage,
  onSave,
  onClose,
  onImport,
  onDelete,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const f of fields) {
      const v = initialValues[f.key]
      initial[f.key] = v === null || v === undefined ? '' : String(v)
    }
    return initial
  })

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const raw = values[f.key]
      const trimmed = raw.trim()
      // Treat empty strings as null — clears the field
      if (trimmed === '') {
        payload[f.key] = null
      } else if (f.type === 'number') {
        const num = Number(trimmed)
        if (!Number.isNaN(num)) payload[f.key] = num
      } else {
        payload[f.key] = trimmed
      }
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold">{title}</h2>

        {errorMessage && (
          <div className="bg-red-900/40 text-red-300 text-sm p-2 rounded">
            {errorMessage}
          </div>
        )}

        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="block text-xs text-slate-400 mb-1">{f.label}</span>
            {f.type === 'select' ? (
              <select
                value={values[f.key] ?? ''}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: e.target.value })
                }
                className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 focus:border-indigo-500 outline-none text-sm"
              >
                <option value="">— Не выбрано —</option>
                {f.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: e.target.value })
                }
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 focus:border-indigo-500 outline-none text-sm"
              />
            )}
          </label>
        ))}

        {onImport && (
          <div className="pt-2">
            <label className="block w-full text-center px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer text-sm font-medium transition-colors">
              📥 Импорт из JSON парсера
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImport(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
                    onDelete()
                  }
                }}
                disabled={submitting}
                className="px-4 py-2 rounded bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors text-sm disabled:opacity-50"
              >
                Удалить
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
