export function ConfirmDeleteModal({ characterName, onConfirm, onCancel }: { characterName: string, onConfirm: () => void, onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl max-w-sm w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-bold mb-2 text-white">Удалить персонажа?</h2>
        <p className="text-slate-400 text-sm mb-6">
          Вы уверены, что хотите удалить <b>{characterName}</b> из трекера? Весь прогресс, включая артефакты и созвездия, будет безвозвратно утерян.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium transition-colors text-white">
            Отмена
          </button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium transition-colors text-white">
            Да, удалить
          </button>
        </div>
      </div>
    </div>
  )
}
