interface Props {
  message?: string
}

export default function ErrorState({ message = 'Что-то пошло не так' }: Props) {
  return (
    <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
      {message}
    </div>
  )
}
