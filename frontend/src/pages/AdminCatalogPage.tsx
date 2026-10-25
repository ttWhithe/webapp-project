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
import AdminEditModal from '@/shared/ui/admin/AdminEditModal'
import ErrorState from '@/shared/ui/ErrorState'

// Наши компоненты
import AdminCharacterTab from '@/features/admin/components/AdminCharacterTab'
import AdminWeaponTab from '@/features/admin/components/AdminWeaponTab'
import AdminArtifactTab from '@/features/admin/components/AdminArtifactTab'
import AdminCharacterModal from '@/features/admin/components/AdminCharacterModal'
import AdminBulkImportModal from '@/features/admin/components/AdminBulkImportModal'
import AdminSyncModal from '@/features/admin/components/AdminSyncModal'

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

  // --- QUERIES ---
  const charactersQuery = useQuery({ queryKey: ['admin', 'characters'], queryFn: () => adminApi.listCharacters(1000, 0), enabled: tab === 'characters' })
  const weaponsQuery = useQuery({ queryKey: ['admin', 'weapons'], queryFn: () => adminApi.listWeapons(1000, 0), enabled: tab === 'weapons' })
  const setsQuery = useQuery({ queryKey: ['admin', 'artifact-sets'], queryFn: () => adminApi.listArtifactSets(1000, 0), enabled: tab === 'artifact-sets' })

  // --- MUTATIONS ---
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

  const updateCharacter = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminCharacterUpdate }) => adminApi.updateCharacter(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'characters'] })
      qc.invalidateQueries({ queryKey: ['characters'] })
      setEditing(null)
      setError(null)
    },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const updateWeapon = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminWeaponUpdate }) => adminApi.updateWeapon(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'weapons'] }); setEditing(null); setError(null); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const updateSet = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminArtifactSetUpdate }) => adminApi.updateArtifactSet(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'artifact-sets'] }); setEditing(null); setError(null); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const deleteCharacter = useMutation({
    mutationFn: (id: string) => adminApi.deleteCharacter(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'characters'] }); setEditing(null); alert('Персонаж удален'); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const deleteWeapon = useMutation({
    mutationFn: (id: string) => adminApi.deleteWeapon(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'weapons'] }); setEditing(null); alert('Оружие удалено'); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const deleteArtifactSet = useMutation({
    mutationFn: (id: string) => adminApi.deleteArtifactSet(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'artifact-sets'] }); setEditing(null); alert('Сет удален'); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const importParser = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => adminApi.importParser(id, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'characters'] }); setEditing(null); alert('Данные импортированы!'); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const importWeaponParser = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => adminApi.importWeaponParser(id, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'weapons'] }); setEditing(null); alert('Данные оружия обновлены!'); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const importArtifactParser = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => adminApi.importArtifactParser(id, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'artifact-sets'] }); setEditing(null); alert('Данные сета обновлены!'); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const createCharacter = useMutation({
    mutationFn: (payload: AdminCharacterCreate) => adminApi.createCharacter(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'characters'] }); setCreating(null); alert('Персонаж добавлен!'); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const createWeapon = useMutation({
    mutationFn: (payload: AdminWeaponCreate) => adminApi.createWeapon(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'weapons'] }); setCreating(null); alert('Оружие добавлено!'); },
    onError: (e: unknown) => setError(extractError(e)),
  })

  const createArtifactSet = useMutation({
    mutationFn: (payload: AdminArtifactSetCreate) => adminApi.createArtifactSet(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'artifact-sets'] }); setCreating(null); alert('Артефакт добавлен!'); },
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
    } catch (e) { setError(extractError(e)) }
  }

  async function handleUploadBackup(file: File) {
    try {
      const stats = await adminApi.uploadBackup(file)
      alert(`Загружено: ${stats.characters} персонажей, ${stats.weapons} оружия, ${stats.artifact_sets} сетов`)
      qc.invalidateQueries({ queryKey: ['admin'] })
    } catch (e) { setError(extractError(e)) }
  }

  const submitting = updateCharacter.isPending || updateWeapon.isPending || updateSet.isPending || importParser.isPending || createCharacter.isPending || createWeapon.isPending || createArtifactSet.isPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Админка каталога</h1>
        <p className="text-slate-400 mt-1">Ручное редактирование записей. Изменения сразу попадают в публичный каталог.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setSyncDialog(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">↻ Синхронизировать</button>
        <button type="button" onClick={handleDownloadBackup} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium">↓ Скачать backup</button>
        <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium cursor-pointer">
          ↑ Загрузить backup
          <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadBackup(f); e.target.value = '' }} />
        </label>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="flex flex-1 gap-1 bg-slate-800 rounded-lg p-1 max-w-md border border-slate-700">
          <TabButton active={tab === 'characters'} onClick={() => setTab('characters')}>Персонажи</TabButton>
          <TabButton active={tab === 'weapons'} onClick={() => setTab('weapons')}>Оружие</TabButton>
          <TabButton active={tab === 'artifact-sets'} onClick={() => setTab('artifact-sets')}>Артефакты</TabButton>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setBulkDialog(true)} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-medium">📦 Пакетный импорт</button>
          <button type="button" onClick={() => {
            setError(null)
            if (tab === 'characters') setCreating({ kind: 'character' })
            else if (tab === 'weapons') setCreating({ kind: 'weapon' })
            else setCreating({ kind: 'artifact-set' })
          }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium">+ Добавить</button>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {/* ТАБЫ С ТАБЛИЦАМИ */}
      {tab === 'characters' && (
        <AdminCharacterTab
          data={charactersQuery.data}
          isLoading={charactersQuery.isLoading}
          isError={charactersQuery.isError}
          onEdit={(row) => { setError(null); setEditing({ kind: 'character', row }) }}
        />
      )}

      {tab === 'weapons' && (
        <AdminWeaponTab
          data={weaponsQuery.data}
          isLoading={weaponsQuery.isLoading}
          isError={weaponsQuery.isError}
          onEdit={(row) => { setError(null); setEditing({ kind: 'weapon', row }) }}
        />
      )}

      {tab === 'artifact-sets' && (
        <AdminArtifactTab
          data={setsQuery.data}
          isLoading={setsQuery.isLoading}
          isError={setsQuery.isError}
          onEdit={(row) => { setError(null); setEditing({ kind: 'artifact-set', row }) }}
        />
      )}

      {/* МОДАЛКИ РЕДАКТИРОВАНИЯ */}
      {editing?.kind === 'character' && (
        <AdminCharacterModal
          row={editing.row}
          submitting={submitting}
          errorMessage={error}
          onSave={(values) => updateCharacter.mutate({ id: editing.row.id, payload: values as AdminCharacterUpdate })}
          onClose={() => { setEditing(null); setError(null) }}
          onImport={(file) => importParser.mutate({ id: editing.row.id, file })}
          onDelete={() => deleteCharacter.mutate(editing.row.id)}
        />
      )}

      {editing?.kind === 'weapon' && (
        <AdminEditModal
          title={`Редактирование: ${editing.row.name}`}
          submitting={submitting}
          errorMessage={error}
          initialValues={{ name_ru: editing.row.name_ru, icon_url: editing.row.icon_url, icon_awakened_url: editing.row.icon_awakened_url, rarity: editing.row.rarity, base_atk: editing.row.base_atk, main_stat: editing.row.main_stat, version_added: editing.row.version_added, passive_name: editing.row.passive_name, passive_desc: editing.row.passive_desc }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' }, { key: 'icon_url', label: 'URL иконки (базовая)' }, { key: 'icon_awakened_url', label: 'URL иконки (пробуждённая)' }, { key: 'rarity', label: 'Редкость (1–5)', type: 'number' }, { key: 'base_atk', label: 'Базовый ATK (90 lvl)', type: 'number' }, { key: 'main_stat', label: 'Основная характеристика' }, { key: 'passive_name', label: 'Название пассивки' }, { key: 'passive_desc', label: 'Описание пассивки' }, { key: 'version_added', label: 'Версия добавления' }
          ]}
          onSave={(values) => updateWeapon.mutate({ id: editing.row.id, payload: values as AdminWeaponUpdate })}
          onImport={(file) => importWeaponParser.mutate({ id: editing.row.id, file })}
          onDelete={() => deleteWeapon.mutate(editing.row.id)}
          onClose={() => { setEditing(null); setError(null) }}
        />
      )}

      {editing?.kind === 'artifact-set' && (
        <AdminEditModal
          title={`Редактирование: ${editing.row.name}`}
          submitting={submitting}
          errorMessage={error}
          initialValues={{ name_ru: editing.row.name_ru, icon_url: editing.row.icon_url, icon_plume_url: editing.row.icon_plume_url, icon_sands_url: editing.row.icon_sands_url, icon_goblet_url: editing.row.icon_goblet_url, icon_circlet_url: editing.row.icon_circlet_url, max_rarity: editing.row.max_rarity, min_rarity: editing.row.min_rarity, bonus_2pc: editing.row.bonus_2pc, bonus_4pc: editing.row.bonus_4pc }}
          fields={[
            { key: 'name_ru', label: 'Русское имя' }, { key: 'icon_url', label: 'URL иконки (Цветок)' }, { key: 'icon_plume_url', label: 'URL иконки (Перо)' }, { key: 'icon_sands_url', label: 'URL иконки (Часы)' }, { key: 'icon_goblet_url', label: 'URL иконки (Кубок)' }, { key: 'icon_circlet_url', label: 'URL иконки (Шапка)' }, { key: 'min_rarity', label: 'Мин. редкость', type: 'number' }, { key: 'max_rarity', label: 'Макс. редкость', type: 'number' }, { key: 'bonus_2pc', label: 'Бонус 2 предметов' }, { key: 'bonus_4pc', label: 'Бонус 4 предметов' }
          ]}
          onSave={(values) => updateSet.mutate({ id: editing.row.id, payload: values as AdminArtifactSetUpdate })}
          onImport={(file) => importArtifactParser.mutate({ id: editing.row.id, file })}
          onDelete={() => deleteArtifactSet.mutate(editing.row.id)}
          onClose={() => { setEditing(null); setError(null) }}
        />
      )}

      {/* МОДАЛКИ СОЗДАНИЯ */}
      {creating?.kind === 'character' && (
        <AdminEditModal title="Новый персонаж" submitting={createCharacter.isPending} errorMessage={error} initialValues={{}} fields={[
          { key: 'name', label: 'Имя (англ)' }, { key: 'slug', label: 'Slug' }, { key: 'element', label: 'Элемент', type: 'select', options: [{ value: 'anemo', label: 'Анемо' }, { value: 'geo', label: 'Гео' }, { value: 'electro', label: 'Электро' }, { value: 'dendro', label: 'Дендро' }, { value: 'hydro', label: 'Гидро' }, { value: 'pyro', label: 'Пиро' }, { value: 'cryo', label: 'Крио' }] }, { key: 'weapon_type', label: 'Оружие', type: 'select', options: [{ value: 'sword', label: 'Одноручный' }, { value: 'claymore', label: 'Двуручный' }, { value: 'polearm', label: 'Древковое' }, { value: 'catalyst', label: 'Катализатор' }, { value: 'bow', label: 'Лук' }] }, { key: 'rarity', label: 'Редкость (1–5)', type: 'number' }
        ]} onSave={(values) => createCharacter.mutate(values as AdminCharacterCreate)} onClose={() => setCreating(null)} />
      )}

      {creating?.kind === 'weapon' && (
        <AdminEditModal title="Новое оружие" submitting={createWeapon.isPending} errorMessage={error} initialValues={{}} fields={[
          { key: 'name', label: 'Имя (англ)' }, { key: 'slug', label: 'Slug' }, { key: 'weapon_type', label: 'Тип оружия', type: 'select', options: [{ value: 'sword', label: 'Одноручный' }, { value: 'claymore', label: 'Двуручный' }, { value: 'polearm', label: 'Древковое' }, { value: 'catalyst', label: 'Катализатор' }, { value: 'bow', label: 'Лук' }] }, { key: 'rarity', label: 'Редкость (1–5)', type: 'number' }
        ]} onSave={(values) => createWeapon.mutate(values as AdminWeaponCreate)} onClose={() => setCreating(null)} />
      )}

      {creating?.kind === 'artifact-set' && (
        <AdminEditModal title="Новый сет артефактов" submitting={createArtifactSet.isPending} errorMessage={error} initialValues={{}} fields={[
          { key: 'name', label: 'Имя (англ)' }, { key: 'slug', label: 'Slug' }
        ]} onSave={(values) => createArtifactSet.mutate(values as AdminArtifactSetCreate)} onClose={() => setCreating(null)} />
      )}

      {/* ДИАЛОГИ */}
      {bulkDialog && <AdminBulkImportModal onClose={() => setBulkDialog(false)} onError={setError} />}
      {syncDialog && <AdminSyncModal isPending={syncMutation.isPending} onConfirm={() => syncMutation.mutate()} onClose={() => setSyncDialog(false)} onDownloadBackup={handleDownloadBackup} />}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
      {children}
    </button>
  )
}

function extractError(e: unknown): string {
  const err = e as { response?: { data?: { detail?: unknown } }; message?: string }
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(' | ')
  if (err.message === 'Network Error') return 'Ошибка сети: бэкенд перезагружается или недоступен.'
  return err.message || 'Произошла неизвестная ошибка'
}
