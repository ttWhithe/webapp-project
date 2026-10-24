import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { adminApi } from '@/shared/api/admin'
import type {
  AdminArtifactSet,
  AdminArtifactSetUpdate,
  AdminArtifactSetCreate,
  AdminCharacter,
  AdminCharacterUpdate,
  AdminCharacterCreate,
  AdminWeapon,
  AdminWeaponUpdate,
  AdminWeaponCreate,
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
  const [creating, setCreating] = useState<{ kind: 'character' | 'weapon' | 'artifact-set' } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const qc = useQueryClient()

  const [syncDialog, setSyncDialog] = useState(false)
  const [bulkDialog, setBulkDialog] = useState(false)
  const [heroesFile, setHeroesFile] = useState<File | null>(null)
  const [weaponsFile, setWeaponsFile] = useState<File | null>(null)
  const [artifactsFile, setArtifactsFile] = useState<File | null>(null)
  const [forceBulk, setForceBulk] = useState(false)

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
    queryFn: () => adminApi.listCharacters(1000, 0),
    enabled: tab === 'characters',
  })

  const weaponsQuery = useQuery({
    queryKey: ['admin', 'weapons'],
    queryFn: () => adminApi.listWeapons(1000, 0),
    enabled: tab === 'weapons',
  })

  const setsQuery = useQuery({
    queryKey: ['admin', 'artifact-sets'],
    queryFn: () => adminApi.listArtifactSets(1000, 0),
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

  const deleteCharacter = useMutation({
    mutationFn: (id: string) => adminApi.deleteCharacter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'characters'] })
      setEditing(null)
      alert('Персонаж удален')
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const deleteWeapon = useMutation({
    mutationFn: (id: string) => adminApi.deleteWeapon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'weapons'] })
      setEditing(null)
      alert('Оружие удалено')
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const deleteArtifactSet = useMutation({
    mutationFn: (id: string) => adminApi.deleteArtifactSet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'artifact-sets'] })
      setEditing(null)
      alert('Сет артефактов удален')
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

  const createCharacter = useMutation({
    mutationFn: (payload: AdminCharacterCreate) => adminApi.createCharacter(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'characters'] })
      setCreating(null)
      alert('Персонаж добавлен!')
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const createWeapon = useMutation({
    mutationFn: (payload: AdminWeaponCreate) => adminApi.createWeapon(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'weapons'] })
      setCreating(null)
      alert('Оружие добавлено!')
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const createArtifactSet = useMutation({
    mutationFn: (payload: AdminArtifactSetCreate) => adminApi.createArtifactSet(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'artifact-sets'] })
      setCreating(null)
      alert('Артефакт добавлен!')
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const bulkImportMutation = useMutation({
    mutationFn: () => adminApi.bulkImport(heroesFile, weaponsFile, artifactsFile, forceBulk),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      setBulkDialog(false)
      setHeroesFile(null); setWeaponsFile(null); setArtifactsFile(null);
      const msg = `Импорт завершен!\n\n` +
        `Персонажи: +${data.characters.added} / ~${data.characters.updated} / пропущено ${data.characters.skipped}\n` +
        `Оружие: +${data.weapons.added} / ~${data.weapons.updated} / пропущено ${data.weapons.skipped}\n` +
        `Артефакты: +${data.artifact_sets.added} / ~${data.artifact_sets.updated} / пропущено ${data.artifact_sets.skipped}`
      alert(msg)
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const submitting =
    updateCharacter.isPending ||
    updateWeapon.isPending ||
    updateSet.isPending ||
    importParser.isPending ||
    createCharacter.isPending ||
    createWeapon.isPending ||
    createArtifactSet.isPending

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

      {/* Tabs and Add Button */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex flex-1 gap-1 bg-slate-800 rounded-lg p-1 max-w-md border border-slate-700">
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBulkDialog(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-medium"
          >
            📦 Пакетный импорт
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null)
              if (tab === 'characters') setCreating({ kind: 'character' })
              else if (tab === 'weapons') setCreating({ kind: 'weapon' })
              else setCreating({ kind: 'artifact-set' })
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium"
          >
            + Добавить
          </button>
        </div>
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
                      {r.icon_url ? (
                        <img src={r.icon_url} alt="icon" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}

                      {r.portrait_url ? (
                        <img src={r.portrait_url} alt="portrait" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}

                      {r.namecard_url ? (
                        <img src={r.namecard_url} alt="namecard" className="w-8 h-8 rounded object-cover bg-slate-900" />
                      ) : <div className="w-8 h-8 rounded bg-slate-700" />}

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
                  sortValue: (r) => r.element,
                  render: (r) => ELEMENT_LABELS[r.element],
                },
                {
                  key: 'weapon_type',
                  label: 'Оружие',
                  className: 'text-xs whitespace-nowrap',
                  sortValue: (r) => r.weapon_type,
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
                  sortValue: (r) => r.weapon_type,
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
                  sortValue: (r) => r.base_atk,
                  render: (r) => r.base_atk ?? '—',
                },
                {
                  key: 'main_stat',
                  label: 'Main Stat',
                  className: 'text-xs text-slate-400 whitespace-nowrap',
                  sortValue: (r) => r.main_stat,
                  render: (r) => r.main_stat ?? '—',
                },
                {
                  key: 'passive',
                  label: 'Пассивка',
                  className: 'text-xs text-slate-400 max-w-[150px] truncate',
                  sortValue: (r) => r.passive_name,
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
          onDelete={() => deleteCharacter.mutate(editing.row.id)}
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
          onDelete={() => deleteWeapon.mutate(editing.row.id)}
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
            min_rarity: editing.row.min_rarity,
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
            { key: 'min_rarity', label: 'Мин. редкость', type: 'number' },
            { key: 'max_rarity', label: 'Макс. редкость', type: 'number' },
            { key: 'bonus_2pc', label: 'Бонус 2 предметов' },
            { key: 'bonus_4pc', label: 'Бонус 4 предметов' },
          ]}
          onSave={(values) => updateSet.mutate({ id: editing.row.id, payload: values as AdminArtifactSetUpdate })}
          onImport={(file) => importArtifactParser.mutate({ id: editing.row.id, file })}
          onDelete={() => deleteArtifactSet.mutate(editing.row.id)}
          onClose={() => {
            setEditing(null)
            setError(null)
          }}
        />
      )}

      {/* Create Modals */}
      {creating?.kind === 'character' && (
        <AdminEditModal
          title="Новый персонаж"
          submitting={createCharacter.isPending}
          errorMessage={error}
          initialValues={{}}
          fields={[
            { key: 'name', label: 'Имя (англ)', placeholder: 'Aloy' },
            { key: 'slug', label: 'Slug (если пусто — сгенерируется)' },
            { key: 'element', label: 'Элемент', type: 'select', options: [
              { value: 'anemo', label: 'Анемо' }, { value: 'geo', label: 'Гео' },
              { value: 'electro', label: 'Электро' }, { value: 'dendro', label: 'Дендро' },
              { value: 'hydro', label: 'Гидро' }, { value: 'pyro', label: 'Пиро' },
              { value: 'cryo', label: 'Крио' },
            ]},
            { key: 'weapon_type', label: 'Оружие', type: 'select', options: [
              { value: 'sword', label: 'Одноручный' }, { value: 'claymore', label: 'Двуручный' },
              { value: 'polearm', label: 'Древковое' }, { value: 'catalyst', label: 'Катализатор' },
              { value: 'bow', label: 'Лук' },
            ]},
            { key: 'rarity', label: 'Редкость (1–5)', type: 'number' },
          ]}
          onSave={(values) => createCharacter.mutate(values as AdminCharacterCreate)}
          onClose={() => setCreating(null)}
        />
      )}

      {creating?.kind === 'weapon' && (
        <AdminEditModal
          title="Новое оружие"
          submitting={createWeapon.isPending}
          errorMessage={error}
          initialValues={{}}
          fields={[
            { key: 'name', label: 'Имя (англ)' },
            { key: 'slug', label: 'Slug (если пусто — сгенерируется)' },
            { key: 'weapon_type', label: 'Тип оружия', type: 'select', options: [
              { value: 'sword', label: 'Одноручный' }, { value: 'claymore', label: 'Двуручный' },
              { value: 'polearm', label: 'Древковое' }, { value: 'catalyst', label: 'Катализатор' },
              { value: 'bow', label: 'Лук' },
            ]},
            { key: 'rarity', label: 'Редкость (1–5)', type: 'number' },
          ]}
          onSave={(values) => createWeapon.mutate(values as AdminWeaponCreate)}
          onClose={() => setCreating(null)}
        />
      )}

      {creating?.kind === 'artifact-set' && (
        <AdminEditModal
          title="Новый сет артефактов"
          submitting={createArtifactSet.isPending}
          errorMessage={error}
          initialValues={{}}
          fields={[
            { key: 'name', label: 'Имя (англ)' },
            { key: 'slug', label: 'Slug (если пусто — сгенерируется)' },
          ]}
          onSave={(values) => createArtifactSet.mutate(values as AdminArtifactSetCreate)}
          onClose={() => setCreating(null)}
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

      {/* Bulk Import Dialog */}
      {bulkDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl max-w-lg w-full">
            <h2 className="text-xl font-bold mb-2">📦 Пакетный импорт из JSON</h2>
            <p className="text-sm text-slate-400 mb-6">
              Выберите файлы, которые вы спарсили. Скрипт добавит новых и обновит существующих,
              но <b>не тронет записи, которые вы правили вручную</b>.
            </p>

            <div className="space-y-3 mb-6">
              {/* Heroes */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">heroes.json</span>
                  <span className={`text-xs ${heroesFile ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {heroesFile ? heroesFile.name : 'Файл не выбран'}
                  </span>
                </div>
                <label className="cursor-pointer px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors text-white">
                  Выбрать
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => setHeroesFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Weapons */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">weapons.json</span>
                  <span className={`text-xs ${weaponsFile ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {weaponsFile ? weaponsFile.name : 'Файл не выбран'}
                  </span>
                </div>
                <label className="cursor-pointer px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors text-white">
                  Выбрать
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => setWeaponsFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Artifacts */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">artifacts.json</span>
                  <span className={`text-xs ${artifactsFile ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {artifactsFile ? artifactsFile.name : 'Файл не выбран'}
                  </span>
                </div>
                <label className="cursor-pointer px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors text-white">
                  Выбрать
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => setArtifactsFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* Загрузка */}
            {bulkImportMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-teal-400 text-sm font-medium">Сравниваем данные и обновляем базу...</p>
                <p className="text-xs text-slate-500">Это может занять до 10 секунд</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    id="forceCheckbox"
                    checked={forceBulk}
                    onChange={(e) => setForceBulk(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="forceCheckbox" className="text-sm text-slate-300 cursor-pointer select-none">
                    Перезаписывать ручные правки (Force)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBulkDialog(false)}
                    className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkImportMutation.mutate()}
                    disabled={!heroesFile && !weaponsFile && !artifactsFile}
                    className="px-4 py-2 rounded bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-sm font-medium"
                  >
                    Начать импорт
                  </button>
                </div>
              </>
            )}
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
  const err = e as { response?: { data?: { detail?: unknown } }; message?: string }

  // Если бэкенд вернул детализацию ошибки
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(' | ')
  }

  // Если это сетевая ошибка (сервер недоступен)
  if (err.message === 'Network Error') {
    return 'Ошибка сети: бэкенд перезагружается или недоступен. Подождите пару секунд и попробуйте снова.'
  }

  return err.message || 'Произошла неизвестная ошибка'
}
