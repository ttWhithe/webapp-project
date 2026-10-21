import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { adminApi } from '@/shared/api/admin'
import type {
  AdminArtifactSet,
  AdminArtifactSetUpdate,
  AdminCharacter,
  AdminCharacterUpdate,
  AdminWeapon,
  AdminWeaponUpdate,
} from '@/shared/api/types'
import { ELEMENT_LABELS, WEAPON_TYPE_LABELS } from '@/shared/lib/catalog-meta'
import AdminEditModal from '@/shared/ui/admin/AdminEditModal'
import AdminTable from '@/shared/ui/admin/AdminTable'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

type Tab = 'characters' | 'weapons' | 'artifact-sets'

type Editing =
  | { kind: 'character'; row: AdminCharacter }
  | { kind: 'weapon'; row: AdminWeapon }
  | { kind: 'artifact-set'; row: AdminArtifactSet }
  | null

export default function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>('characters')
  const [editing, setEditing] = useState<Editing>(null)
  const [error, setError] = useState<string | null>(null)

  const qc = useQueryClient()

  const [syncDialog, setSyncDialog] = useState(false)

  const syncMutation = useMutation({
    mutationFn: () => adminApi.syncCatalog(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['characters'] })
      qc.invalidateQueries({ queryKey: ['weapons'] })
      qc.invalidateQueries({ queryKey: ['artifact-sets'] })
      setSyncDialog(false)
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  async function handleDownloadBackup() {
    try {
      const blob = await adminApi.downloadBackup()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'catalog_backup.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(extractError(e))
    }
  }

  async function handleUploadBackup(file: File) {
    try {
      const stats = await adminApi.uploadBackup(file)
      alert(
        `Загружено: ${stats.characters} персонажей, ` +
          `${stats.weapons} оружия, ${stats.artifact_sets} сетов`,
      )
      qc.invalidateQueries({ queryKey: ['admin'] })
    } catch (e) {
      setError(extractError(e))
    }
  }

  const charactersQuery = useQuery({
    queryKey: ['admin', 'characters'],
    queryFn: () => adminApi.listCharacters(200, 0),
    enabled: tab === 'characters',
  })

  const weaponsQuery = useQuery({
    queryKey: ['admin', 'weapons'],
    queryFn: () => adminApi.listWeapons(200, 0),
    enabled: tab === 'weapons',
  })

  const setsQuery = useQuery({
    queryKey: ['admin', 'artifact-sets'],
    queryFn: () => adminApi.listArtifactSets(200, 0),
    enabled: tab === 'artifact-sets',
  })

  const updateCharacter = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminCharacterUpdate }) =>
      adminApi.updateCharacter(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'characters'] })
      qc.invalidateQueries({ queryKey: ['characters'] })
      qc.invalidateQueries({ queryKey: ['character'] })
      setEditing(null)
      setError(null)
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const updateWeapon = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminWeaponUpdate }) =>
      adminApi.updateWeapon(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'weapons'] })
      qc.invalidateQueries({ queryKey: ['weapons'] })
      setEditing(null)
      setError(null)
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const updateSet = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminArtifactSetUpdate }) =>
      adminApi.updateArtifactSet(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'artifact-sets'] })
      setEditing(null)
      setError(null)
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const importParser = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      adminApi.importParser(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'characters'] })
      qc.invalidateQueries({ queryKey: ['characters'] })
      setEditing(null)
      alert('Данные успешно импортированы!')
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const importWeaponParser = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => adminApi.importWeaponParser(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'weapons'] })
      setEditing(null)
      alert('Данные оружия обновлены!')
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const importArtifactParser = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => adminApi.importArtifactParser(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'artifact-sets'] })
      setEditing(null)
      alert('Данные сета обновлены!')
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const submitting =
    updateCharacter.isPending ||
    updateWeapon.isPending ||
    updateSet.isPending ||
    importParser.isPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Админка каталога</h1>
        <p className="text-slate-400 mt-1">
          Ручное редактирование записей. Изменения сразу попадают в публичный
          каталог (сбрасывают кэш).
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSyncDialog(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium"
        >
          ↻ Синхронизировать
        </button>
        <button
          type="button"
          onClick={handleDownloadBackup}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
        >
          ↓ Скачать backup
        </button>
        <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium cursor-pointer">
          ↑ Загрузить backup
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUploadBackup(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 max-w-md border border-slate-700">
        <TabButton active={tab === 'characters'} onClick={() => setTab('characters')}>
          Персонажи
        </TabButton>
        <TabButton active={tab === 'weapons'} onClick={() => setTab('weapons')}>
          Оружие
        </TabButton>
        <TabButton
          active={tab === 'artifact-sets'}
          onClick={() => setTab('artifact-sets')}
        >
          Артефакты
        </TabButton>
      </div>

      {error && <ErrorState message={error} />}

      {/* Characters */}
      {tab === 'characters' && (
        <>
          {charactersQuery.isLoading && <LoadingSpinner />}
          {charactersQuery.isError && <ErrorState />}
          {charactersQuery.data && (
            <AdminTable<AdminCharacter>
              rows={charactersQuery.data}
              rowKey={(r) => r.id}
              onEdit={(row) => {
                setError(null)
                setEditing({ kind: 'character', row })
              }}
              columns={[
                {
                  key: 'icon',
                  label: 'Картинки',
                  className: 'w-44 shrink-0',
                  render: (r) => (
                    <div className="flex flex-nowrap gap-1">
                      {/* Иконка */}
                      {r.icon_url ? (
                        <img src={r.icon_url} alt="icon" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}

                      {/* Портрет */}
                      {r.portrait_url ? (
                        <img src={r.portrait_url} alt="portrait" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}

                      {/* Namecard */}
                      {r.namecard_url ? (
                        <img src={r.namecard_url} alt="namecard" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}

                      {/* Иконка созвездия */}
                      {r.constellation_icon_url ? (
                        <img src={r.constellation_icon_url} alt="constellation" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}
                    </div>
                  ),
                },
                {
                  key: 'name',
                  label: 'Имя',
                  render: (r) => (
                    <div>
                      <div className="font-medium whitespace-nowrap">{r.name}</div>
                      {r.name_ru && <div className="text-xs text-slate-400 whitespace-nowrap">{r.name_ru}</div>}
                    </div>
                  ),
                },
                {
                  key: 'title',
                  label: 'Титул',
                  className: 'text-xs text-slate-400 max-w-[200px] truncate',
                  render: (r) => r.title ?? '—',
                },
                {
                  key: 'element',
                  label: 'Элемент',
                  className: 'text-xs whitespace-nowrap',
                  render: (r) => ELEMENT_LABELS[r.element],
                },
                {
                  key: 'weapon_type',
                  label: 'Оружие',
                  className: 'text-xs whitespace-nowrap',
                  render: (r) => WEAPON_TYPE_LABELS[r.weapon_type],
                },
                {
                  key: 'rarity',
                  label: 'Ред.',
                  className: 'w-16 text-center whitespace-nowrap',
                  render: (r) => `★${r.rarity}`,
                },
                {
                  key: 'region',
                  label: 'Регион',
                  className: 'text-xs text-slate-400 whitespace-nowrap',
                  render: (r) => r.region ?? '—',
                },
                {
                  key: 'birthday',
                  label: 'Д.Р.',
                  className: 'text-xs text-slate-400 whitespace-nowrap',
                  render: (r) => r.birthday ?? '—',
                },
                {
                  key: 'release_date',
                  label: 'Релиз',
                  className: 'text-xs text-slate-400 whitespace-nowrap',
                  render: (r) => r.release_date ?? '—',
                },
                {
                  key: 'c35',
                  label: 'C3 / C5',
                  className: 'text-xs text-slate-400 whitespace-nowrap',
                  sortable: false,
                  render: (r) => (
                    <div>
                      <div>C3: {r.c3_increases ?? '—'}</div>
                      <div>C5: {r.c5_increases ?? '—'}</div>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {/* Weapons */}
      {tab === 'weapons' && (
        <>
          {weaponsQuery.isLoading && <LoadingSpinner />}
          {weaponsQuery.isError && <ErrorState />}
          {weaponsQuery.data && (
            <AdminTable<AdminWeapon>
              rows={weaponsQuery.data}
              rowKey={(r) => r.id}
              onEdit={(row) => {
                setError(null)
                setEditing({ kind: 'weapon', row })
              }}
              columns={[
                {
                  key: 'icon',
                  label: 'Иконки',
                  className: 'w-24 shrink-0',
                  render: (r) => (
                    <div className="flex flex-nowrap gap-1">
                      {r.icon_url ? (
                        <img src={r.icon_url} alt="base" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}

                      {r.icon_awakened_url ? (
                        <img src={r.icon_awakened_url} alt="awakened" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}
                    </div>
                  ),
                },
                {
                  key: 'name',
                  label: 'Имя',
                  render: (r) => (
                    <div>
                      <div className="font-medium whitespace-nowrap">{r.name}</div>
                      {r.name_ru && <div className="text-xs text-slate-400 whitespace-nowrap">{r.name_ru}</div>}
                    </div>
                  ),
                },
                {
                  key: 'type',
                  label: 'Тип',
                  className: 'text-xs whitespace-nowrap',
                  render: (r) => WEAPON_TYPE_LABELS[r.weapon_type],
                },
                {
                  key: 'rarity',
                  label: 'Ред.',
                  className: 'w-16 text-center whitespace-nowrap',
                  render: (r) => `★${r.rarity}`,
                },
                {
                  key: 'atk',
                  label: 'Base ATK',
                  className: 'text-xs text-slate-400 whitespace-nowrap',
                  render: (r) => r.base_atk ?? '—',
                },
                {
                  key: 'main_stat',
                  label: 'Main Stat',
                  className: 'text-xs text-slate-400 whitespace-nowrap',
                  render: (r) => r.main_stat ?? '—',
                },
                {
                  key: 'passive',
                  label: 'Пассивка',
                  className: 'text-xs text-slate-400 max-w-[150px] truncate',
                  render: (r) => r.passive_name ?? '—',
                },
              ]}
            />
          )}
        </>
      )}

      {/* Artifact sets */}
      {tab === 'artifact-sets' && (
        <>
          {setsQuery.isLoading && <LoadingSpinner />}
          {setsQuery.isError && <ErrorState />}
          {setsQuery.data && (
            <AdminTable<AdminArtifactSet>
              rows={setsQuery.data}
              rowKey={(r) => r.id}
              onEdit={(row) => {
                setError(null)
                setEditing({ kind: 'artifact-set', row })
              }}
              columns={[
                {
                  key: 'icon',
                  label: 'Иконки слотов',
                  className: 'w-48 shrink-0',
                  render: (r) => (
                    <div className="flex flex-nowrap gap-1">
                      {[r.icon_url, r.icon_plume_url, r.icon_sands_url, r.icon_goblet_url, r.icon_circlet_url].map((url, i) => (
                        <div key={i} className="w-8 h-8 rounded bg-slate-900 shrink-0">
                          {url ? (
                            <img src={url} alt="slot" className="w-full h-full object-cover rounded" />
                          ) : (
                            <div className="w-full h-full rounded bg-slate-700" />
                          )}
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'name',
                  label: 'Имя',
                  render: (r) => (
                    <div>
                      <div className="font-medium whitespace-nowrap">{r.name}</div>
                      {r.name_ru && <div className="text-xs text-slate-400 whitespace-nowrap">{r.name_ru}</div>}
                    </div>
                  ),
                },
                {
                  key: 'slug',
                  label: 'Slug',
                  className: 'text-slate-400 text-xs whitespace-nowrap',
                  render: (r) => r.slug,
                },
                {
                  key: 'bonuses',
                  label: 'Бонусы',
                  className: 'text-xs text-slate-400 max-w-[300px] truncate',
                  render: (r) => (
                    <div className="truncate" title={`2pc: ${r.bonus_2pc}\n4pc: ${r.bonus_4pc}`}>
                      {r.bonus_2pc ? r.bonus_2pc : '—'}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {/* Edit modals */}
      {editing?.kind === 'character' && (
        <AdminEditModal
          title={`Редактирование: ${editing.row.name}`}
          submitting={submitting}
          errorMessage={error}
          initialValues={{
            name_ru: editing.row.name_ru,
            title: editing.row.title,
            icon_url: editing.row.icon_url,
            portrait_url: editing.row.portrait_url,
            rarity: editing.row.rarity,
            region: editing.row.region,
            birthday: editing.row.birthday,
            version_added: editing.row.version_added,
            release_date: editing.row.release_date,
            namecard_url: editing.row.namecard_url,
            constellation_icon_url: editing.row.constellation_icon_url,
            c3_increases: editing.row.c3_increases,
            c5_increases: editing.row.c5_increases,
          }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' },
            { key: 'title', label: 'Титул' },
            { key: 'icon_url', label: 'URL Icon (Портрет)' },
            { key: 'portrait_url', label: 'URL Full (страница персонажа)' },
            { key: 'rarity', label: 'Редкость (1–5)', type: 'number' },
            { key: 'region', label: 'Регион' },
            { key: 'birthday', label: 'День рождения' },
            { key: 'version_added', label: 'Версия добавления' },
            { key: 'release_date', label: 'Дата релиза' },
            { key: 'namecard_url', label: 'URL Namecard (карточка)' },
            { key: 'constellation_icon_url', label: 'URL иконки созвездия' },
            {
              key: 'c3_increases',
              label: '3-е созвездие повышает:',
              type: 'select',
              options: [
                { value: 'Normal Attack', label: 'Обычная атака' },
                { value: 'Elemental Skill', label: 'Элементальный навык' },
                { value: 'Elemental Burst', label: 'Взрыв стихии' },
              ],
            },
            {
              key: 'c5_increases',
              label: '5-е созвездие повышает:',
              type: 'select',
              options: [
                { value: 'Normal Attack', label: 'Обычная атака' },
                { value: 'Elemental Skill', label: 'Элементальный навык' },
                { value: 'Elemental Burst', label: 'Взрыв стихии' },
              ],
            },
          ]}
          onSave={(values) =>
            updateCharacter.mutate({
              id: editing.row.id,
              payload: values as AdminCharacterUpdate,
            })
          }
          onClose={() => {
            setEditing(null)
            setError(null)
          }}
          onImport={(file) =>
            importParser.mutate({ id: editing.row.id, file })
          }
        />
      )}

      {editing?.kind === 'weapon' && (
        <AdminEditModal
          title={`Редактирование: ${editing.row.name}`}
          submitting={submitting}
          errorMessage={error}
          initialValues={{
            name_ru: editing.row.name_ru,
            icon_url: editing.row.icon_url,
            icon_awakened_url: editing.row.icon_awakened_url,
            rarity: editing.row.rarity,
            base_atk: editing.row.base_atk,
            main_stat: editing.row.main_stat,
            version_added: editing.row.version_added,
            passive_name: editing.row.passive_name,
            passive_desc: editing.row.passive_desc,
          }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' },
            { key: 'icon_url', label: 'URL иконки (базовая)' },
            { key: 'icon_awakened_url', label: 'URL иконки (пробуждённая)' },
            { key: 'rarity', label: 'Редкость (1–5)', type: 'number' },
            { key: 'base_atk', label: 'Базовый ATK (90 lvl)', type: 'number' },
            { key: 'main_stat', label: 'Основная характеристика' },
            { key: 'passive_name', label: 'Название пассивки' },
            { key: 'passive_desc', label: 'Описание пассивки' },
            { key: 'version_added', label: 'Версия добавления' },
          ]}
          onSave={(values) => updateWeapon.mutate({ id: editing.row.id, payload: values as AdminWeaponUpdate })}
          onImport={(file) => importWeaponParser.mutate({ id: editing.row.id, file })}
          onClose={() => {
            setEditing(null)
            setError(null)
          }}
        />
      )}

      {editing?.kind === 'artifact-set' && (
        <AdminEditModal
          title={`Редактирование: ${editing.row.name}`}
          submitting={submitting}
          errorMessage={error}
          initialValues={{
            name_ru: editing.row.name_ru,
            icon_url: editing.row.icon_url,
            icon_plume_url: editing.row.icon_plume_url,
            icon_sands_url: editing.row.icon_sands_url,
            icon_goblet_url: editing.row.icon_goblet_url,
            icon_circlet_url: editing.row.icon_circlet_url,
            max_rarity: editing.row.max_rarity,
            bonus_2pc: editing.row.bonus_2pc,
            bonus_4pc: editing.row.bonus_4pc,
          }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' },
            { key: 'icon_url', label: 'URL иконки (Цветок)' },
            { key: 'icon_plume_url', label: 'URL иконки (Перо)' },
            { key: 'icon_sands_url', label: 'URL иконки (Часы)' },
            { key: 'icon_goblet_url', label: 'URL иконки (Кубок)' },
            { key: 'icon_circlet_url', label: 'URL иконки (Шапка)' },
            { key: 'max_rarity', label: 'Макс. редкость', type: 'number' },
            { key: 'bonus_2pc', label: 'Бонус 2 предметов' },
            { key: 'bonus_4pc', label: 'Бонус 4 предметов' },
          ]}
          onSave={(values) => updateSet.mutate({ id: editing.row.id, payload: values as AdminArtifactSetUpdate })}
          onImport={(file) => importArtifactParser.mutate({ id: editing.row.id, file })}
          onClose={() => {
            setEditing(null)
            setError(null)
          }}
        />
      )}

      {/* Sync confirmation dialog */}
      {syncDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl max-w-md">
            <h2 className="text-lg font-bold">
              ⚠ Sync перезапишет ручные правки
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              Рекомендуем сначала скачать backup. Продолжить?
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
              >
                Скачать
              </button>
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm"
              >
                {syncMutation.isPending ? 'Синхронизация...' : 'Продолжить'}
              </button>
              <button
                type="button"
                onClick={() => setSyncDialog(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function extractError(e: unknown): string {
  const err = e as { response?: { data?: { detail?: unknown } } }
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  return 'Не удалось сохранить изменения'
}
