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
                  className: 'w-12',
                  render: (r) =>
                    r.icon_url ? (
                      <img
                        src={r.icon_url}
                        alt={r.name}
                        className="w-9 h-9 rounded object-cover bg-slate-900"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.opacity = '0.2'
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded bg-slate-700" />
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
                  className: 'w-12',
                  render: (r) =>
                    r.icon_url ? (
                      <img
                        src={r.icon_url}
                        alt={r.name}
                        className="w-9 h-9 rounded object-cover bg-slate-900"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.opacity = '0.2'
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded bg-slate-700" />
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
                  className: 'w-12',
                  render: (r) =>
                    r.icon_url ? (
                      <img
                        src={r.icon_url}
                        alt={r.name}
                        className="w-9 h-9 rounded object-cover bg-slate-900"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.opacity = '0.2'
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded bg-slate-700" />
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
            { key: 'icon_url', label: 'URL иконки (для карточек)' },
            { key: 'portrait_url', label: 'URL портрета (для карточки героя)' },
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
            rarity: editing.row.rarity,
            base_atk: editing.row.base_atk,
            main_stat: editing.row.main_stat,
            version_added: editing.row.version_added,
          }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' },
            { key: 'icon_url', label: 'URL иконки' },
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
          }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' },
            { key: 'icon_url', label: 'URL иконки' },
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
