import type { AdminCharacter, AdminCharacterUpdate } from '@/shared/api/types'
import AdminEditModal from '@/shared/ui/admin/AdminEditModal'

interface Props {
  row: AdminCharacter
  submitting: boolean
  errorMessage: string | null
  onSave: (values: Record<string, unknown>) => void
  onClose: () => void
  onImport: (file: File) => void
  onDelete: () => void
}

export default function AdminCharacterModal({ row, submitting, errorMessage, onSave, onClose, onImport, onDelete }: Props) {
  return (
    <AdminEditModal
      title={`Редактирование: ${row.name}`}
      submitting={submitting}
      errorMessage={errorMessage}
      initialValues={{
        name_ru: row.name_ru,
        title: row.title,
        icon_url: row.icon_url,
        portrait_url: row.portrait_url,
        rarity: row.rarity,
        region: row.region,
        birthday: row.birthday,
        version_added: row.version_added,
        release_date: row.release_date,
        namecard_url: row.namecard_url,
        constellation_icon_url: row.constellation_icon_url,
        element: row.element,
        weapon_type: row.weapon_type,
        slug: row.slug,
        c3_increases: row.c3_increases,
        c5_increases: row.c5_increases,

        // --- ТАЛАНТЫ ---
        talent_normal_url: row.talents?.['Normal Attack']?.icon || '',
        talent_skill_url: row.talents?.['Elemental Skill']?.icon || '',
        talent_burst_url: row.talents?.['Elemental Burst']?.icon || '',

        // --- ПАССИВКИ ---
        talent_passive_1_url: row.talents?.['1st Ascension Passive']?.icon || '',
        talent_passive_4_url: row.talents?.['4th Ascension Passive']?.icon || '',
        talent_passive_util_url: row.talents?.['Utility Passive']?.icon || '',

        // --- СОЗВЕЗДИЯ ---
        c1_icon: row.constellations?.['1']?.icon || '',
        c1_desc: row.constellations?.['1']?.description || '',
        c2_icon: row.constellations?.['2']?.icon || '',
        c2_desc: row.constellations?.['2']?.description || '',
        c3_icon: row.constellations?.['3']?.icon || '',
        c3_desc: row.constellations?.['3']?.description || '',
        c4_icon: row.constellations?.['4']?.icon || '',
        c4_desc: row.constellations?.['4']?.description || '',
        c5_icon: row.constellations?.['5']?.icon || '',
        c5_desc: row.constellations?.['5']?.description || '',
        c6_icon: row.constellations?.['6']?.icon || '',
        c6_desc: row.constellations?.['6']?.description || '',
      }}
      fields={[
        // --- БАЗОВЫЕ ПОЛЯ ---
        { key: 'name_ru', label: 'Русское имя' },
        { key: 'slug', label: 'Slug (только чтение)' },
        { key: 'title', label: 'Титул' },
        { key: 'icon_url', label: 'URL Icon (Портрет)' },
        { key: 'portrait_url', label: 'URL Full (страница)' },
        { key: 'rarity', label: 'Редкость', type: 'number' },
        { key: 'region', label: 'Регион' },
        { key: 'birthday', label: 'День рождения' },
        { key: 'version_added', label: 'Версия добавления' },
        { key: 'release_date', label: 'Дата релиза' },
        { key: 'namecard_url', label: 'URL Namecard' },
        { key: 'constellation_icon_url', label: 'URL иконки созвездия (общая)' },
        { key: 'element', label: 'Элемент', type: 'select', options: [
          { value: 'anemo', label: 'Анемо' }, { value: 'geo', label: 'Гео' },
          { value: 'electro', label: 'Электро' }, { value: 'dendro', label: 'Дендро' },
          { value: 'hydro', label: 'Гидро' }, { value: 'pyro', label: 'Пиро' },
          { value: 'cryo', label: 'Крио' },
        ]},
        { key: 'weapon_type', label: 'Тип оружия', type: 'select', options: [
          { value: 'sword', label: 'Одноручный' }, { value: 'claymore', label: 'Двуручный' },
          { value: 'polearm', label: 'Древковое' }, { value: 'catalyst', label: 'Катализатор' },
          { value: 'bow', label: 'Лук' },
        ]},

        // --- АКТИВНЫЕ ТАЛАНТЫ ---
        { key: 'talent_normal_url', label: 'Иконка: Обычная атака' },
        { key: 'talent_skill_url', label: 'Иконка: Элем. навык' },
        { key: 'talent_burst_url', label: 'Иконка: Взрыв стихии' },

        // --- ПАССИВНЫЕ ТАЛАНТЫ ---
        { key: 'talent_passive_1_url', label: 'Иконка: 1st Ascension Passive' },
        { key: 'talent_passive_4_url', label: 'Иконка: 4th Ascension Passive' },
        { key: 'talent_passive_util_url', label: 'Иконка: Utility Passive' },

        // --- БУСТЫ C3 / C5 ---
        { key: 'c3_increases', label: '3-е созвездие повышает:', type: 'select', options: [
          { value: 'Normal Attack', label: 'Обычная атака' }, { value: 'Elemental Skill', label: 'Элем. навык' }, { value: 'Elemental Burst', label: 'Взрыв стихии' }
        ]},
        { key: 'c5_increases', label: '5-е созвездие повышает:', type: 'select', options: [
          { value: 'Normal Attack', label: 'Обычная атака' }, { value: 'Elemental Skill', label: 'Элем. навык' }, { value: 'Elemental Burst', label: 'Взрыв стихии' }
        ]},

        // --- СОЗВЕЗДИЯ ---
        { key: 'c1_icon', label: 'C1: URL иконки' }, { key: 'c1_desc', label: 'C1: Описание', type: 'textarea' },
        { key: 'c2_icon', label: 'C2: URL иконки' }, { key: 'c2_desc', label: 'C2: Описание', type: 'textarea' },
        { key: 'c3_icon', label: 'C3: URL иконки' }, { key: 'c3_desc', label: 'C3: Описание', type: 'textarea' },
        { key: 'c4_icon', label: 'C4: URL иконки' }, { key: 'c4_desc', label: 'C4: Описание', type: 'textarea' },
        { key: 'c5_icon', label: 'C5: URL иконки' }, { key: 'c5_desc', label: 'C5: Описание', type: 'textarea' },
        { key: 'c6_icon', label: 'C6: URL иконки' }, { key: 'c6_desc', label: 'C6: Описание', type: 'textarea' },
      ]}
      onSave={(values) => {
        const payload: any = { ...values }

        payload.talents = {
          "Normal Attack": { icon: values.talent_normal_url },
          "Elemental Skill": { icon: values.talent_skill_url },
          "Elemental Burst": { icon: values.talent_burst_url },
          "1st Ascension Passive": { icon: values.talent_passive_1_url },
          "4th Ascension Passive": { icon: values.talent_passive_4_url },
          "Utility Passive": { icon: values.talent_passive_util_url },
        }

        payload.constellations = {
          "1": { icon: values.c1_icon, description: values.c1_desc },
          "2": { icon: values.c2_icon, description: values.c2_desc },
          "3": { icon: values.c3_icon, description: values.c3_desc, increases: values.c3_increases },
          "4": { icon: values.c4_icon, description: values.c4_desc },
          "5": { icon: values.c5_icon, description: values.c5_desc, increases: values.c5_increases },
          "6": { icon: values.c6_icon, description: values.c6_desc },
        }

        const flatFields = [
          'talent_normal_url', 'talent_skill_url', 'talent_burst_url',
          'talent_passive_1_url', 'talent_passive_4_url', 'talent_passive_util_url',
          'c1_icon', 'c1_desc', 'c2_icon', 'c2_desc', 'c3_icon', 'c3_desc',
          'c4_icon', 'c4_desc', 'c5_icon', 'c5_desc', 'c6_icon', 'c6_desc'
        ]
        flatFields.forEach(f => delete payload[f])

        onSave(payload as AdminCharacterUpdate)
      }}
      onClose={onClose}
      onImport={onImport}
      onDelete={onDelete}
    />
  )
}
