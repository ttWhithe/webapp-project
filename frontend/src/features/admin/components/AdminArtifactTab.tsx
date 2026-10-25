import type { AdminArtifactSet } from '@/shared/api/types'
import AdminTable from '@/shared/ui/admin/AdminTable'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

interface Props {
  data: AdminArtifactSet[] | undefined
  isLoading: boolean
  isError: boolean
  onEdit: (row: AdminArtifactSet) => void
}

export default function AdminArtifactTab({ data, isLoading, isError, onEdit }: Props) {
  if (isLoading) return <LoadingSpinner />
  if (isError || !data) return <ErrorState />

  return (
    <AdminTable<AdminArtifactSet>
      rows={data}
      rowKey={(r) => r.id}
      onEdit={onEdit}
      columns={[
        {
          key: 'icon', label: 'Иконки слотов', className: 'w-48 shrink-0',
          render: (r) => (
            <div className="flex flex-nowrap gap-1">
              {[r.icon_url, r.icon_plume_url, r.icon_sands_url, r.icon_goblet_url, r.icon_circlet_url].map((url, i) => (
                <div key={i} className="w-8 h-8 rounded bg-slate-900 shrink-0">
                  {url ? <img src={url} alt="slot" className="w-full h-full object-cover rounded" /> : <div className="w-full h-full rounded bg-slate-700" />}
                </div>
              ))}
            </div>
          ),
        },
        { key: 'name', label: 'Имя', render: (r) => <div><div className="font-medium whitespace-nowrap">{r.name}</div>{r.name_ru && <div className="text-xs text-slate-400 whitespace-nowrap">{r.name_ru}</div>}</div> },
        { key: 'slug', label: 'Slug', className: 'text-slate-400 text-xs whitespace-nowrap', render: (r) => r.slug },
        { key: 'bonuses', label: 'Бонусы', className: 'text-xs text-slate-400 max-w-[300px] truncate', render: (r) => <div className="truncate" title={`2pc: ${r.bonus_2pc}\n4pc: ${r.bonus_4pc}`}>{r.bonus_2pc ? r.bonus_2pc : '—'}</div> },
      ]}
    />
  )
}
