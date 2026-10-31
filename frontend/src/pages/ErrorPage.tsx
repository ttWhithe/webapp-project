import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'

export default function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()

  let title = 'Что-то пошло не так'
  let message = 'Произошла непредвиденная ошибка.'
  let iconSrc = '/icons/errors/generic.png'

  // Определяем тип ошибки
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Страница не найдена'
      message = 'Похоже, эта страница потерялась в Бездне. Возможно, она была удалена или вы ошиблись с адресом.'
      iconSrc = '/icons/errors/404.png'
    } else if (error.status === 401 || error.status === 403) {
      title = 'Доступ запрещен'
      message = 'У вас нет прав для просмотра этой страницы. Пожалуйста, войдите в аккаунт.'
      iconSrc = '/icons/errors/401.png'
    } else if (error.status === 500) {
      title = 'Ошибка сервера'
      message = 'Наши сервера прилегли отдохнуть. Мы уже чиним это, попробуйте обновить страницу позже.'
      iconSrc = '/icons/errors/500.png'
    }
  } else if (error instanceof Error) {
    // Ошибки JS (например, TypeError)
    message = error.message
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center select-none">
      <img
        src={iconSrc}
        alt={title}
        className="w-48 h-48 md:w-64 md:h-64 object-contain mb-8 animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
      />

      <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
        {title}
      </h1>

      <p className="text-slate-400 max-w-md mb-10 text-lg">
        {message}
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-slate-800 border border-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium"
        >
          Вернуться назад
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-medium shadow-lg shadow-indigo-500/20"
        >
          На главную
        </button>
      </div>
    </div>
  )
}
