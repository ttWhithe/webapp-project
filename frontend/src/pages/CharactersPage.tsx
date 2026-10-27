import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { catalogApi } from '@/shared/api/catalog'
import { trackerApi } from '@/shared/api/tracker'
import type { CharacterListParams } from '@/shared/api/types'
import CharacterCard from '@/shared/ui/CharacterCard'
import CharacterFilters from '@/shared/ui/CharacterFilters'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

export default function CharactersPage() {
  const [filters, setFilters] = useState<CharacterListParams>({
    sort: 'name_asc',
  })

  // Запрашиваем ВСЕХ персонажей один раз. Больше не дергаем бэкенд при смене фильтров.
  const catalogQuery = useQuery({
    queryKey: ['characters', 'all'],
    queryFn: () => catalogApi.listCharacters({ limit: 200 }),
    staleTime: 5 * 60_000,
  })

  const mineQuery = useQuery({
    queryKey: ['me', 'characters'],
    queryFn: () => trackerApi.listMine(),
    staleTime: 60_000,
  })

  const progressMap = useMemo(() => {
    const map = new Map<string, { progress: number; level: number; crowns: number; constellation: number }>()
    for (const item of mineQuery.data ?? []) {
      map.set(item.character.id, {
        progress: item.progress,
        level: item.level,
        crowns: item.crowns_used,
        constellation: item.constellation,
      })
    }
    return map
  }, [mineQuery.data])

  // ЛОКАЛЬНАЯ ФИЛЬТРАЦИЯ И СОРТИРОВКА
  const displayedItems = useMemo(() => {
    if (!catalogQuery.data?.items) return []

    let result = [...catalogQuery.data.items]

    // 1. Фильтрация
    if (filters.element) result = result.filter(c => c.element === filters.element)
    if (filters.weapon_type) result = result.filter(c => c.weapon_type === filters.weapon_type)
    if (filters.rarity) result = result.filter(c => c.rarity === filters.rarity)

    if (filters.region) {
      if (filters.region === 'none') {
        // Показываем только тех, у кого регион пустой (null, undefined или '')
        result = result.filter(c => !c.region)
      } else {
        result = result.filter(c => c.region === filters.region)
      }
    }

    // 2. Сортировка (Сначала мои, потом остальные)
    return result.sort((a, b) => {
      const aHas = progressMap.has(a.id) ? 1 : 0
      const bHas = progressMap.has(b.id) ? 1 : 0

      if (aHas !== bHas) return bHas - aHas

      // Внутри группы
      if (filters.sort === 'rarity_desc') return b.rarity - a.rarity
      if (filters.sort === 'release_date_desc') {
        // Сортируем по дате. Если даты нет, кидаем в конец.
        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0
        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0
        return dateB - dateA
      }

      const nameA = a.name_ru || a.name
      const nameB = b.name_ru || b.name
      return nameA.localeCompare(nameB)
    })
  }, [catalogQuery.data?.items, progressMap, filters])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Каталог персонажей</h1>
        <p className="text-slate-400 mt-1">
          {catalogQuery.data ? `Найдено: ${displayedItems.length}` : 'Загрузка каталога...'}
          {mineQuery.data && mineQuery.data.length > 0 && (
            <span className="ml-2 text-indigo-400">• В трекере: {mineQuery.data.length}</span>
          )}
        </p>
      </div>

      <CharacterFilters value={filters} onChange={setFilters} />

      {catalogQuery.isLoading && <LoadingSpinner />}

      {catalogQuery.isError && (
        <ErrorState message={(catalogQuery.error as { message?: string })?.message ?? 'Ошибка загрузки каталога'} />
      )}

      {catalogQuery.data && displayedItems.length === 0 && (
        <div className="text-center text-slate-400 py-12">По выбранным фильтрам ничего не найдено</div>
      )}

      {catalogQuery.data && displayedItems.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {displayedItems.map((c) => {
            const mine = progressMap.get(c.id)
            return (
              <CharacterCard
                key={c.id}
                character={c}
                progress={mine?.progress}
                level={mine?.level}
                crowns={mine?.crowns}
                constellation={mine?.constellation}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
