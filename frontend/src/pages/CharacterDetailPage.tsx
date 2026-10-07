import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { catalogApi } from '@/shared/api/catalog'
import { ELEMENT_COLORS, ELEMENT_LABELS, WEAPON_TYPE_LABELS } from '@/shared/lib/catalog-meta'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

export default function CharacterDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['character', slug],
    queryFn: () => catalogApi.getCharacter(slug!),
    enabled: !!slug,
  })

  if (isLoading) return <LoadingSpinner />
  if (isError || !data) return <ErrorState message="Персонаж не найден" />

  return (
    <div className="space-y-6">
      <Link to="/characters" className="text-sm text-indigo-400 hover:underline">
        ← Назад к каталогу
      </Link>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr] gap-6 p-6">
          <div className="bg-slate-900 rounded-xl overflow-hidden aspect-square">
            {data.portrait_url || data.icon_url ? (
              <img
                src={data.portrait_url ?? data.icon_url ?? ''}
                alt={data.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                Нет изображения
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{data.name}</h1>
              {data.title && <p className="text-slate-400 mt-1">{data.title}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`px-3 py-1 rounded border text-sm ${ELEMENT_COLORS[data.element]}`}
              >
                {ELEMENT_LABELS[data.element]}
              </span>
              <span className="px-3 py-1 rounded border border-slate-600 text-sm">
                {WEAPON_TYPE_LABELS[data.weapon_type]}
              </span>
              <span className="px-3 py-1 rounded border border-slate-600 text-sm">
                {data.rarity}★
              </span>
              {data.region && (
                <span className="px-3 py-1 rounded border border-slate-600 text-sm">
                  {data.region}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm pt-4 border-t border-slate-700">
              {data.birthday && (
                <>
                  <dt className="text-slate-400">День рождения</dt>
                  <dd>{data.birthday}</dd>
                </>
              )}
              {data.version_added && (
                <>
                  <dt className="text-slate-400">Добавлен в версии</dt>
                  <dd>{data.version_added}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
