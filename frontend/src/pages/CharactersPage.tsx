import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { catalogApi } from '@/shared/api/catalog'
import { trackerApi } from '@/shared/api/tracker'
import type { CharacterListParams } from '@/shared/api/types'
import CharacterCard from '@/shared/ui/CharacterCard'
import CharacterFilters from '@/shared/ui/CharacterFilters'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import Pagination from '@/shared/ui/Pagination'

const PAGE_SIZE = 24

export default function CharactersPage() {
  const [filters, setFilters] = useState<CharacterListParams>({
    sort: 'name_asc',
    limit: PAGE_SIZE,
    offset: 0,
  })

  const catalogQuery = useQuery({
    queryKey: ['characters', filters],
    queryFn: () => catalogApi.listCharacters(filters),
  })

  const mineQuery = useQuery({
    queryKey: ['me', 'characters'],
    queryFn: () => trackerApi.listMine(),
    staleTime: 60_000,
  })

  // Map character_id -> user's progression data
  const progressMap = useMemo(() => {
    const map = new Map<
      string,
      { progress: number; level: number; crowns: number }
    >()
    for (const item of mineQuery.data ?? []) {
      map.set(item.character.id, {
        progress: item.progress,
        level: item.level,
        crowns: item.crowns_used,
      })
    }
    return map
  }, [mineQuery.data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Каталог персонажей</h1>
        <p className="text-slate-400 mt-1">
          {catalogQuery.data
            ? `Найдено: ${catalogQuery.data.total}`
            : 'Загрузка каталога...'}
          {mineQuery.data && mineQuery.data.length > 0 && (
            <span className="ml-2 text-indigo-400">
              • В трекере: {mineQuery.data.length}
            </span>
          )}
        </p>
      </div>

      <CharacterFilters value={filters} onChange={setFilters} />

      {catalogQuery.isLoading && <LoadingSpinner />}

      {catalogQuery.isError && (
        <ErrorState
          message={
            (catalogQuery.error as { message?: string })?.message ??
            'Ошибка загрузки каталога'
          }
        />
      )}

      {catalogQuery.data && catalogQuery.data.items.length === 0 && (
        <div className="text-center text-slate-400 py-12">
          По выбранным фильтрам ничего не найдено
        </div>
      )}

      {catalogQuery.data && catalogQuery.data.items.length > 0 && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {catalogQuery.data.items.map((c) => {
              const mine = progressMap.get(c.id)
              return (
                <CharacterCard
                  key={c.id}
                  character={c}
                  progress={mine?.progress}
                  level={mine?.level}
                  crowns={mine?.crowns}
                />
              )
            })}
          </div>

          <Pagination
            total={catalogQuery.data.total}
            limit={filters.limit ?? PAGE_SIZE}
            offset={filters.offset ?? 0}
            onChange={(offset) => setFilters({ ...filters, offset })}
          />
        </>
      )}
    </div>
  )
}
