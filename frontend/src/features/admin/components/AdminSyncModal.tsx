interface Props {
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
  onDownloadBackup: () => void
}

export default function AdminSyncModal({ isPending, onConfirm, onClose, onDownloadBackup }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl max-w-md">
        <h2 className="text-lg font-bold">⚠ Sync перезапишет ручные правки</h2>
        <p className="text-slate-400 mt-2 text-sm">Рекомендуем сначала скачать backup. Продолжить?</p>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onDownloadBackup} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
            Скачать
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm">
            {isPending ? 'Синхронизация...' : 'Продолжить'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm">
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
