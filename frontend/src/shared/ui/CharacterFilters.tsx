import type { CharacterListParams, Element, WeaponType } from '@/shared/api/types'
import { ELEMENT_LABELS, WEAPON_TYPE_LABELS } from '@/shared/lib/catalog-meta'

interface Props {
  value: CharacterListParams
  onChange: (next: CharacterListParams) => void
}

const ALL_ELEMENTS: Element[] = [
  'pyro',
  'hydro',
  'anemo',
  'electro',
  'dendro',
  'cryo',
  'geo',
]

const ALL_WEAPON_TYPES: WeaponType[] = ['sword', 'claymore', 'polearm', 'bow', 'catalyst']

const PAGE_SIZE_OPTIONS = [
  { value: '24', label: '24' },
  { value: '48', label: '48' },
  { value: '96', label: '96' },
  { value: '200', label: 'Все (200)' },
]

export default function CharacterFilters({ value, onChange }: Props) {
  function update(patch: Partial<CharacterListParams>) {
    // Changing limit should reset offset to 0
    const resetOffset = 'limit' in patch ? { offset: 0 } : {}
    onChange({ ...value, ...patch, ...resetOffset })
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FilterSelect
          label="Элемент"
          value={value.element ?? ''}
          onChange={(v) => update({ element: (v || undefined) as Element | undefined })}
          options={[
            { value: '', label: 'Все' },
            ...ALL_ELEMENTS.map((e) => ({ value: e, label: ELEMENT_LABELS[e] })),
          ]}
        />

        <FilterSelect
          label="Оружие"
          value={value.weapon_type ?? ''}
          onChange={(v) =>
            update({ weapon_type: (v || undefined) as WeaponType | undefined })
          }
          options={[
            { value: '', label: 'Все' },
            ...ALL_WEAPON_TYPES.map((w) => ({
              value: w,
              label: WEAPON_TYPE_LABELS[w],
            })),
          ]}
        />

        <FilterSelect
          label="Редкость"
          value={value.rarity?.toString() ?? ''}
          onChange={(v) => update({ rarity: v ? Number(v) : undefined })}
          options={[
            { value: '', label: 'Все' },
            { value: '5', label: '5★' },
            { value: '4', label: '4★' },
          ]}
        />

        <FilterSelect
          label="Сортировка"
          value={value.sort ?? 'name_asc'}
          onChange={(v) => update({ sort: v as CharacterListParams['sort'] })}
          options={[
            { value: 'name_asc', label: 'По имени' },
            { value: 'rarity_desc', label: 'По редкости' },
            { value: 'version_desc', label: 'По версии' },
          ]}
        />

        <FilterSelect
          label="На странице"
          value={value.limit?.toString() ?? '24'}
          onChange={(v) => update({ limit: Number(v) })}
          options={PAGE_SIZE_OPTIONS}
        />
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-400 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 focus:border-indigo-500 outline-none text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
