import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { adminApi } from '@/shared/api/admin'

interface Props {
  onClose: () => void
  onError: (msg: string) => void
}

export default function AdminBulkImportModal({ onClose, onError }: Props) {
  const [heroesFile, setHeroesFile] = useState<File | null>(null)
  const [weaponsFile, setWeaponsFile] = useState<File | null>(null)
  const [artifactsFile, setArtifactsFile] = useState<File | null>(null)
  const [forceBulk, setForceBulk] = useState(false)

  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => adminApi.bulkImport(heroesFile, weaponsFile, artifactsFile, forceBulk),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      onClose()
      const msg = `Импорт завершен!\n\n` +
        `Персонажи: +${data.characters.added} / ~${data.characters.updated} / пропущено ${data.characters.skipped}\n` +
        `Оружие: +${data.weapons.added} / ~${data.weapons.updated} / пропущено ${data.weapons.skipped}\n` +
        `Артефакты: +${data.artifact_sets.added} / ~${data.artifact_sets.updated} / пропущено ${data.artifact_sets.skipped}`
      alert(msg)
    },
    onError: (e: any) => onError(e.message || 'Ошибка импорта'),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl max-w-lg w-full">
        <h2 className="text-xl font-bold mb-2">📦 Пакетный импорт из JSON</h2>
        <p className="text-sm text-slate-400 mb-6">
          Выберите файлы, которые вы спарсили. Скрипт добавит новых и обновит существующих,
          но <b>не тронет записи, которые вы правили вручную</b>.
        </p>

        <div className="space-y-3 mb-6">
          {[
            { label: 'heroes.json', file: heroesFile, setFile: setHeroesFile },
            { label: 'weapons.json', file: weaponsFile, setFile: setWeaponsFile },
            { label: 'artifacts.json', file: artifactsFile, setFile: setArtifactsFile },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">{item.label}</span>
                <span className={`text-xs ${item.file ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {item.file ? item.file.name : 'Файл не выбран'}
                </span>
              </div>
              <label className="cursor-pointer px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors text-white">
                Выбрать
                <input type="file" accept=".json" className="hidden" onChange={(e) => item.setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          ))}
        </div>

        {mutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-teal-400 text-sm font-medium">Сравниваем данные и обновляем базу...</p>
            <p className="text-xs text-slate-500">Это может занять до 10 секунд</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
              <input type="checkbox" id="forceCheckbox" checked={forceBulk} onChange={(e) => setForceBulk(e.target.checked)} className="w-4 h-4 cursor-pointer" />
              <label htmlFor="forceCheckbox" className="text-sm text-slate-300 cursor-pointer select-none">
                Перезаписывать ручные правки (Force)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm">
                Отмена
              </button>
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={!heroesFile && !weaponsFile && !artifactsFile}
                className="px-4 py-2 rounded bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-sm font-medium"
              >
                Начать импорт
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
