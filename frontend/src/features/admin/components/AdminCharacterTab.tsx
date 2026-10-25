import type { AdminCharacter } from '@/shared/api/types'
import { ELEMENT_LABELS, WEAPON_TYPE_LABELS } from '@/shared/lib/catalog-meta'
import AdminTable from '@/shared/ui/admin/AdminTable'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

interface Props {
  data: AdminCharacter[] | undefined
  isLoading: boolean
  isError: boolean
  onEdit: (row: AdminCharacter) => void
}

export default function AdminCharacterTab({ data, isLoading, isError, onEdit }: Props) {
  if (isLoading) return <LoadingSpinner />
  if (isError || !data) return <ErrorState />

  return (
    <AdminTable<AdminCharacter>
      rows={data}
      rowKey={(r) => r.id}
      onEdit={onEdit}
      columns={[
        {
          key: 'icon', label: 'Картинки', className: 'w-40 shrink-0',
          render: (r) => (
            <div className="flex flex-nowrap gap-1">
              {[r.icon_url, r.portrait_url, r.namecard_url, r.constellation_icon_url].map((url, i) => (
                <div key={i} className="w-8 h-8 rounded bg-slate-900 shrink-0">
                  {url ? <img src={url} alt="img" className="w-full h-full object-cover rounded" /> : <div className="w-full h-full bg-slate-700 rounded" />}
                </div>
              ))}
            </div>
          ),
        },
        {
          key: 'name', label: 'Имя', className: 'min-w-[150px]',
          render: (r) => (
            <div>
              <div className="font-medium whitespace-nowrap">{r.name}</div>
              {r.name_ru && <div className="text-xs text-slate-400 whitespace-nowrap">{r.name_ru}</div>}
            </div>
          ),
        },
        {
          key: 'talents', label: 'Скиллы (Актив + Пассив)', className: 'w-64 shrink-0', sortable: false,
          render: (r) => (
            <div className="flex flex-nowrap items-center gap-1">
              {['Normal Attack', 'Elemental Skill', 'Elemental Burst'].map((key, i) => {
                const url = r.talents?.[key]?.icon
                return (
                  <div key={`active-${i}`} className="w-8 h-8 rounded bg-slate-900 shrink-0 border border-indigo-500/30" title={key}>
                    {url ? <img src={url} alt="talent" className="w-full h-full object-cover rounded" /> : <div className="w-full h-full bg-slate-700 rounded" />}
                  </div>
                )
              })}
              <div className="w-[1px] h-6 bg-slate-600 mx-1 shrink-0" />
              {['1st Ascension Passive', '4th Ascension Passive', 'Utility Passive'].map((key, i) => {
                const url = r.talents?.[key]?.icon
                return (
                  <div key={`passive-${i}`} className="w-8 h-8 rounded bg-slate-900 shrink-0 border border-emerald-500/30" title={key}>
                    {url ? <img src={url} alt="passive" className="w-full h-full object-cover rounded" /> : <div className="w-full h-full bg-slate-700 rounded" />}
                  </div>
                )
              })}
            </div>
          ),
        },
        {
          key: 'constellations', label: 'Созвездия (C1-C6)', className: 'w-52 shrink-0', sortable: false,
          render: (r) => (
            <div className="flex flex-nowrap gap-1">
              {[1, 2, 3, 4, 5, 6].map((lvl) => {
                const url = r.constellations?.[String(lvl)]?.icon
                return (
                  <div key={lvl} className="w-8 h-8 rounded bg-slate-900 shrink-0 relative group">
                    {url ? (
                      <>
                        <img src={url} alt={`C${lvl}`} className="w-full h-full object-cover rounded" />
                        <span className="absolute -top-1 -left-1 bg-indigo-600 text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">C{lvl}</span>
                      </>
                    ) : <div className="w-full h-full bg-slate-700 rounded flex items-center justify-center text-[10px] text-slate-500">C{lvl}</div>}
                  </div>
                )
              })}
            </div>
          ),
        },
        { key: 'title', label: 'Титул', className: 'text-xs text-slate-400 max-w-[150px] truncate', render: (r) => r.title ?? '—' },
        { key: 'element', label: 'Элемент', className: 'text-xs whitespace-nowrap', sortValue: (r) => r.element, render: (r) => ELEMENT_LABELS[r.element] },
        { key: 'weapon_type', label: 'Оружие', className: 'text-xs whitespace-nowrap', sortValue: (r) => r.weapon_type, render: (r) => WEAPON_TYPE_LABELS[r.weapon_type] },
        { key: 'rarity', label: 'Ред.', className: 'w-16 text-center whitespace-nowrap', render: (r) => `★${r.rarity}` },
        { key: 'region', label: 'Регион', className: 'text-xs text-slate-400 whitespace-nowrap', sortValue: (r) => r.region, render: (r) => r.region ?? '—' },
        {
          key: 'c35', label: 'C3 / C5 буст', className: 'text-xs text-slate-400 whitespace-nowrap', sortable: false,
          render: (r) => <div><div>C3: {r.c3_increases ?? '—'}</div><div>C5: {r.c5_increases ?? '—'}</div></div>,
        },
      ]}
    />
  )
}
