export default function LoadingSpinner({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-sm text-slate-400">{text}</span>
    </div>
  )
}
