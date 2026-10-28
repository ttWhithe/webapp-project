import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { catalogApi } from '@/shared/api/catalog'
import { trackerApi } from '@/shared/api/tracker'
import { ELEMENT_EMOJI, ELEMENT_HEX, getRarityBackground } from '@/shared/lib/catalog-meta'
import CircularProgress from '@/shared/ui/CircularProgress'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

export default function Dashboard() {
  // ==========================================
  // НАСТРОЙКИ ШАХМАТНОГО ПОРЯДКА (МЕНЯЙ ЗДЕСЬ)
  // ==========================================
  const ROW_SIZE = 14
  const CHAR_SIZE = 100
  const OVERLAP_Y = -50
  const ODD_ROW_OFFSET = 0
  // ==========================================

  const mineQuery = useQuery({
    queryKey: ['me', 'characters'],
    queryFn: () => trackerApi.listMine(),
    staleTime: 60_000,
  })

  const catalogQuery = useQuery({
    queryKey: ['characters', 'all'],
    queryFn: () => catalogApi.listCharacters({ limit: 200 }),
    staleTime: 5 * 60_000,
  })

  const catalogMap = useMemo(() => {
    const map = new Map<string, any>()
    for (const item of catalogQuery.data?.items ?? []) {
      map.set(item.id, item)
    }
    return map
  }, [catalogQuery.data])

  const stats = useMemo(() => {
    if (!mineQuery.data) return null
    let crowns = 0
    let stella = 0
    let totalProgress = 0

    for (const item of mineQuery.data) {
      crowns += item.crowns_used
      stella += item.masterless_stella_fortuna || 0
      totalProgress += item.progress
    }

    return {
      crowns,
      stella,
      avgProgress: mineQuery.data.length ? Math.round(totalProgress / mineQuery.data.length) : 0,
      owned: mineQuery.data.length,
      total: catalogQuery.data?.total || 0,
    }
  }, [mineQuery.data, catalogQuery.data])

  const topThree = useMemo(() => {
    if (!mineQuery.data) return []
    return [...mineQuery.data].sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress
      if (b.level !== a.level) return b.level - a.level
      if (b.constellation !== a.constellation) return b.constellation - a.constellation
      return (a.character.name_ru || a.character.name).localeCompare(b.character.name_ru || b.character.name)
    }).slice(0, 3)
  }, [mineQuery.data])

  const ownedIds = useMemo(() => new Set(mineQuery.data?.map(c => c.character.id) || []), [mineQuery.data])

  const rows = useMemo(() => {
    if (!catalogQuery.data?.items) return []
    const result = []
    const items = catalogQuery.data.items
    let i = 0
    let isOddRow = false

    while (i < items.length) {
      const currentSize = isOddRow ? ROW_SIZE - 1 : ROW_SIZE
      result.push(items.slice(i, i + currentSize))
      i += currentSize
      isOddRow = !isOddRow
    }
    return result
  }, [catalogQuery.data?.items, ROW_SIZE])

  if (mineQuery.isLoading || catalogQuery.isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-12 pb-20 select-none">

      {/* 1. ПРИВЕТСТВИЕ */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Личный кабинет</h1>
        <p className="text-slate-400">Добро пожаловать в Genshin Tracker. Ваш прогресс под контролем.</p>
      </div>

      {/* 2. СТАТИСТИКА */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Получено персонажей</p>
            <p className="text-3xl font-bold text-indigo-400">{stats.owned} <span className="text-lg text-slate-500">/ {stats.total}</span></p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Средний прогресс</p>
            <p className="text-3xl font-bold text-emerald-400">{stats.avgProgress}%</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Использовано корон</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.crowns}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Masterless Stella Fortuna</p>
            <p className="text-3xl font-bold text-purple-400">{stats.stella}</p>
          </div>
        </div>
      )}

      {/* 3. ЭЛИТА АККАУНТА ИЛИ КНОПКА ДОБАВЛЕНИЯ */}
      {topThree.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">Элита аккаунта</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {topThree.map((char) => {
              const colors = ELEMENT_HEX[char.character.element as keyof typeof ELEMENT_HEX]
              const fullChar = catalogMap.get(char.character.id)
              const namecardUrl = fullChar?.namecard_url || getRarityBackground(char.character.rarity, char.character.slug)
              const uid = `GL-${char.id.split('-')[0].toUpperCase()}`
              const issueDate = char.updated_at
                ? new Date(char.updated_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '00.00.0000'

              return (
                <div
                  key={char.id}
                  className="relative w-full aspect-[21/10] rounded-2xl overflow-hidden border border-slate-600 shadow-xl group"
                >
                  {namecardUrl && (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${namecardUrl})` }}
                    />
                  )}

                  <div className="absolute inset-0 bg-slate-900/50 bg-gradient-to-t from-slate-900/90 to-transparent" />

                  <div className="absolute top-3 right-4 text-[10px] font-mono text-white/50 tracking-widest">
                    UID: {uid}
                  </div>

                  <div className="absolute bottom-3 right-4 text-[10px] font-mono text-white/50 tracking-widest">
                    Выдан: {issueDate}
                  </div>

                  <div className="relative p-5 h-full flex items-center justify-between">
                    <div className="flex items-center gap-4 h-[80%]">
                      <div
                        className="h-full aspect-square rounded-xl overflow-hidden shrink-0 border-2 border-white/30 shadow-2xl"
                        style={{ backgroundImage: `url(${getRarityBackground(char.character.rarity, char.character.slug)})`, backgroundSize: 'cover' }}
                      >
                        <img src={char.character.icon_url || ''} alt={char.character.name} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex flex-col justify-between h-full py-1">
                        <h3 className="text-xl md:text-2xl font-bold truncate text-white drop-shadow-md">
                          {char.character.name_ru || char.character.name}
                        </h3>

                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-sm text-slate-200 drop-shadow font-bold">
                            <span>{ELEMENT_EMOJI[char.character.element]}</span>
                            <span className="font-mono text-xs tracking-widest text-slate-300">lvl.{char.level}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="flex items-center gap-1 text-yellow-300" title="Короны">
                              <span className="text-sm">👑</span> {char.crowns_used}
                            </span>
                            <span className="flex items-center gap-1 text-indigo-300" title="Созвездия">
                              <span className="text-sm">C</span> {char.constellation}
                            </span>
                            <span className="flex items-center gap-1 text-pink-300" title="Дружба">
                              <span className="text-sm">💖</span> {char.friendship}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 relative flex items-center justify-center mr-2">
                      <CircularProgress
                        value={char.progress}
                        size={96}
                        strokeWidth={10}
                        fillColor={colors.secondary}
                        emptyColor={colors.main}
                        innerColor={colors.main}
                        borderColor={colors.secondary}
                        textColor={colors.secondary}
                        textStroke={colors.accent}
                        borderWidth={2}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* КНОПКА ДЛЯ ПУСТОГО АККАУНТА */
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 to-slate-800 border border-indigo-500/30 p-10 flex flex-col items-center justify-center text-center shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://static.wikia.nocookie.net/gensin-impact/images/8/83/Namecard_Background_Celebration_-_Windblume_Festival.png')] bg-cover bg-center opacity-10 mix-blend-overlay" />
          <h2 className="text-3xl font-bold mb-4 z-10 text-white">Начните свое путешествие!</h2>
          <p className="text-slate-300 mb-8 max-w-lg z-10">
            Вы еще не добавили ни одного персонажа в трекер. Перейдите в каталог, выберите своего любимчика и начните отслеживать его прогресс.
          </p>
          <Link
            to="/characters"
            className="z-10 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-lg transition-transform hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
          >
            + Добавить первого персонажа
          </Link>
        </div>
      )}

      {/* 4. ШКОЛЬНОЕ ФОТО (ШАХМАТНЫЙ ПОРЯДОК) */}
      <div className="flex flex-col items-center pt-8">
        <h2 className="text-2xl font-bold mb-2">Вселенная Genshin</h2>
        <p className="text-slate-400 text-sm mb-12 text-center max-w-md">
          Ваша коллекция. Цветные персонажи есть в трекере, серые — еще не добавлены.
        </p>

        <div className="flex flex-col items-center w-full overflow-hidden">
          {rows.map((row, rowIndex) => {
            const isOddRow = rowIndex % 2 !== 0
            const applyMask = rowIndex > 0

            return (
              <div
                key={rowIndex}
                className="flex justify-center w-full"
                style={{
                  marginTop: rowIndex > 0 ? `${OVERLAP_Y}px` : '0',
                  marginLeft: isOddRow ? `${ODD_ROW_OFFSET}px` : '0',
                  zIndex: rowIndex + 10,
                  position: 'relative',
                }}
              >
                {row.map((char) => {
                  const isOwned = ownedIds.has(char.id)
                  return (
                    <div
                      key={char.id}
                      className="relative transition-all duration-300 hover:z-50 hover:scale-110 hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]"
                      style={{
                        width: `${CHAR_SIZE}px`,
                        height: `${CHAR_SIZE}px`,
                        filter: isOwned ? 'none' : 'grayscale(100%) brightness(0.3)',
                        maskImage: applyMask ? 'linear-gradient(to bottom, transparent 0%, black 25%)' : 'none',
                        WebkitMaskImage: applyMask ? 'linear-gradient(to bottom, transparent 0%, black 25%)' : 'none',
                      }}
                      title={char.name_ru || char.name}
                    >
                      {char.icon_url && <img src={char.icon_url} alt={char.name} className="w-full h-full object-contain drop-shadow-md" />}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
