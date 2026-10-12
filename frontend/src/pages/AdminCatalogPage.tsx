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

  const submitting =
    updateCharacter.isPending || updateWeapon.isPending || updateSet.isPending

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
                  label: '',
                  className: 'w-24',
                  render: (r) => (
                    <div className="flex gap-1">
                      {r.icon_url ? (
                        <img
                          src={r.icon_url}
                          alt={`${r.name} icon`}
                          className="w-9 h-9 rounded object-cover bg-slate-900"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.opacity = '0.2'
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-slate-700" title="нет иконки" />
                      )}
                      {r.portrait_url ? (
                        <img
                          src={r.portrait_url}
                          alt={`${r.name} portrait`}
                          className="w-9 h-9 rounded object-cover bg-slate-900"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.opacity = '0.2'
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-slate-700" title="нет портрета" />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'name',
                  label: 'Имя',
                  render: (r) => (
                    <div>
                      <div className="font-medium">{r.name}</div>
                      {r.name_ru && (
                        <div className="text-xs text-slate-400">{r.name_ru}</div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'slug',
                  label: 'Slug',
                  className: 'text-slate-400 text-xs',
                  render: (r) => r.slug,
                },
                {
                  key: 'element',
                  label: 'Элемент',
                  className: 'text-xs',
                  render: (r) => ELEMENT_LABELS[r.element],
                },
                {
                  key: 'weapon_type',
                  label: 'Оружие',
                  className: 'text-xs',
                  render: (r) => WEAPON_TYPE_LABELS[r.weapon_type],
                },
                {
                  key: 'rarity',
                  label: 'Ред.',
                  className: 'w-16',
                  render: (r) => `★${r.rarity}`,
                },
                {
                  key: 'region',
                  label: 'Регион',
                  className: 'text-xs text-slate-400',
                  render: (r) => r.region ?? '—',
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
                  label: '',
                  className: 'w-24',
                  render: (r) => (
                    <div className="flex gap-1">
                      {r.icon_url && (
                        <img
                          src={r.icon_url}
                          alt={r.name}
                          className="w-9 h-9 rounded object-cover bg-slate-900"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.opacity = '0.2'
                          }}
                        />
                      )}
                      {r.icon_awakened_url && (
                        <img
                          src={r.icon_awakened_url}
                          alt={`${r.name} awakened`}
                          className="w-9 h-9 rounded object-cover bg-slate-900"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.opacity = '0.2'
                          }}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'name',
                  label: 'Имя',
                  render: (r) => (
                    <div>
                      <div className="font-medium">{r.name}</div>
                      {r.name_ru && (
                        <div className="text-xs text-slate-400">{r.name_ru}</div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'type',
                  label: 'Тип',
                  className: 'text-xs',
                  render: (r) => WEAPON_TYPE_LABELS[r.weapon_type],
                },
                {
                  key: 'rarity',
                  label: 'Ред.',
                  className: 'w-16',
                  render: (r) => `★${r.rarity}`,
                },
                {
                  key: 'atk',
                  label: 'Base ATK',
                  className: 'text-xs text-slate-400',
                  render: (r) => r.base_atk ?? '—',
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
                  label: '',
                  className: 'w-40',
                  render: (r) => (
                    <div className="flex gap-1">
                      {(
                        [
                          r.icon_url,
                          r.icon_plume_url,
                          r.icon_sands_url,
                          r.icon_goblet_url,
                          r.icon_circlet_url,
                        ] as (string | null)[]
                      ).map((url, i) => (
                        <div key={i} className="w-8 h-8 rounded bg-slate-900">
                          {url && (
                            <img
                              src={url}
                              alt=""
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.opacity = '0.2'
                              }}
                            />
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
                      <div className="font-medium">{r.name}</div>
                      {r.name_ru && (
                        <div className="text-xs text-slate-400">{r.name_ru}</div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'slug',
                  label: 'Slug',
                  className: 'text-slate-400 text-xs',
                  render: (r) => r.slug,
                },
              ]}
            />
          )}
        </>
      )}

      {/* Edit modal */}
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
          }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' },
            { key: 'icon_url', label: 'URL иконки (базовая)' },
            { key: 'icon_awakened_url', label: 'URL иконки (пробуждённая)' },
            { key: 'rarity', label: 'Редкость (1–5)', type: 'number' },
            { key: 'base_atk', label: 'Базовый ATK', type: 'number' },
            { key: 'main_stat', label: 'Основная характеристика' },
            { key: 'version_added', label: 'Версия добавления' },
          ]}
          onSave={(values) =>
            updateWeapon.mutate({
              id: editing.row.id,
              payload: values as AdminWeaponUpdate,
            })
          }
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
          }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' },
            { key: 'icon_url', label: 'URL иконки (Цветок)' },
            { key: 'icon_plume_url', label: 'URL иконки (Перо)' },
            { key: 'icon_sands_url', label: 'URL иконки (Часы)' },
            { key: 'icon_goblet_url', label: 'URL иконки (Кубок)' },
            { key: 'icon_circlet_url', label: 'URL иконки (Шапка)' },
          ]}
          onSave={(values) =>
            updateSet.mutate({
              id: editing.row.id,
              payload: values as AdminArtifactSetUpdate,
            })
          }
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
