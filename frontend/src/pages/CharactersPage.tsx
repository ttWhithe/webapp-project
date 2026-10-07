import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { catalogApi } from '@/shared/api/catalog'
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['characters', filters],
    queryFn: () => catalogApi.listCharacters(filters),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Каталог персонажей</h1>
        <p className="text-slate-400 mt-1">
          {data ? `Найдено: ${data.total}` : 'Загрузка каталога...'}
        </p>
      </div>

      <CharacterFilters value={filters} onChange={setFilters} />

      {isLoading && <LoadingSpinner />}

      {isError && (
        <ErrorState
          message={
            (error as { message?: string })?.message ?? 'Ошибка загрузки каталога'
          }
        />
      )}

      {data && data.items.length === 0 && (
        <div className="text-center text-slate-400 py-12">
          По выбранным фильтрам ничего не найдено
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.items.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>

          <Pagination
            total={data.total}
            limit={filters.limit ?? PAGE_SIZE}
            offset={filters.offset ?? 0}
            onChange={(offset) => setFilters({ ...filters, offset })}
          />
        </>
      )}
    </div>
  )
}
