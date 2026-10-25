import type { AdminWeapon } from '@/shared/api/types'
import { WEAPON_TYPE_LABELS } from '@/shared/lib/catalog-meta'
import AdminTable from '@/shared/ui/admin/AdminTable'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

interface Props {
  data: AdminWeapon[] | undefined
  isLoading: boolean
  isError: boolean
  onEdit: (row: AdminWeapon) => void
}

export default function AdminWeaponTab({ data, isLoading, isError, onEdit }: Props) {
  if (isLoading) return <LoadingSpinner />
  if (isError || !data) return <ErrorState />

  return (
    <AdminTable<AdminWeapon>
      rows={data}
      rowKey={(r) => r.id}
      onEdit={onEdit}
      columns={[
        {
          key: 'icon', label: 'Иконки', className: 'w-24 shrink-0',
          render: (r) => (
            <div className="flex flex-nowrap gap-1">
              {r.icon_url ? <img src={r.icon_url} alt="base" className="w-8 h-8 rounded object-cover bg-slate-900" /> : <div className="w-8 h-8 rounded bg-slate-700" />}
              {r.icon_awakened_url ? <img src={r.icon_awakened_url} alt="awakened" className="w-8 h-8 rounded object-cover bg-slate-900" /> : <div className="w-8 h-8 rounded bg-slate-700" />}
            </div>
          ),
        },
        { key: 'name', label: 'Имя', render: (r) => <div><div className="font-medium whitespace-nowrap">{r.name}</div>{r.name_ru && <div className="text-xs text-slate-400 whitespace-nowrap">{r.name_ru}</div>}</div> },
        { key: 'type', label: 'Тип', className: 'text-xs whitespace-nowrap', sortValue: (r) => r.weapon_type, render: (r) => WEAPON_TYPE_LABELS[r.weapon_type] },
        { key: 'rarity', label: 'Ред.', className: 'w-16 text-center whitespace-nowrap', render: (r) => `★${r.rarity}` },
        { key: 'atk', label: 'Base ATK', className: 'text-xs text-slate-400 whitespace-nowrap', sortValue: (r) => r.base_atk, render: (r) => r.base_atk ?? '—' },
        { key: 'main_stat', label: 'Main Stat', className: 'text-xs text-slate-400 whitespace-nowrap', sortValue: (r) => r.main_stat, render: (r) => r.main_stat ?? '—' },
        { key: 'passive', label: 'Пассивка', className: 'text-xs text-slate-400 max-w-[150px] truncate', sortValue: (r) => r.passive_name, render: (r) => r.passive_name ?? '—' },
      ]}
    />
  )
}
