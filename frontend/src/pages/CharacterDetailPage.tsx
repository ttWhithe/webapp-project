import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { catalogApi } from '@/shared/api/catalog'
import { trackerApi } from '@/shared/api/tracker'
import { useCharacterDraft } from '@/shared/lib/useCharacterDraft'
import { useSectionScroll } from '@/shared/lib/useSectionScroll'
import ErrorState from '@/shared/ui/ErrorState'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

import { ZONES } from '@/features/character-detail/constants'
import { ZoneHero } from '@/features/character-detail/zones/ZoneHero'
import { ZoneStats } from '@/features/character-detail/zones/ZoneStats'
import { ZoneWeaponArtifacts } from '@/features/character-detail/zones/ZoneWeaponArtifacts'
import { ZoneConstellations } from '@/features/character-detail/zones/ZoneConstellations'
import type { EquipmentSlotKey } from '@/features/character-detail/constants'
import { ConfirmDeleteModal } from '@/features/character-detail/components/ConfirmDeleteModal'

export default function CharacterDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const qc = useQueryClient()
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotKey>('weapon')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const catalogQuery = useQuery({
    queryKey: ['character', slug],
    queryFn: () => catalogApi.getCharacter(slug!),
    enabled: !!slug,
  })

  const mineQuery = useQuery({
    queryKey: ['me', 'characters'],
    queryFn: () => trackerApi.listMine(),
    staleTime: 30_000,
  })

  const setsQuery = useQuery({
    queryKey: ['artifact-sets'],
    queryFn: () => catalogApi.listArtifactSets({ limit: 200 }),
    staleTime: 5 * 60_000,
  })

  const tracked = mineQuery.data?.find((c) => c.character.slug === slug)
  const detailQuery = useQuery({
    queryKey: ['me', 'characters', 'detail', tracked?.id],
    queryFn: () => trackerApi.getMine(tracked!.id),
    enabled: !!tracked,
  })

  const weaponsQuery = useQuery({
    queryKey: ['weapons', catalogQuery.data?.weapon_type],
    queryFn: () => catalogApi.listWeapons({ weapon_type: catalogQuery.data?.weapon_type, sort: 'rarity_desc', limit: 200 }),
    enabled: !!catalogQuery.data?.weapon_type,
    staleTime: 5 * 60_000,
  })

  const detail = detailQuery.data
  const artifactSets = setsQuery.data?.items || []
  const weapons = weaponsQuery.data?.items || []

  // Ищем однозвездочное оружие для заглушки (например, "Dull Blade")
  const defaultWeapon = weapons.find((w: any) => w.rarity === 1)

  const handleSave = async (
    patch: Parameters<typeof trackerApi.updateMine>[1],
  ) => {
    if (!tracked) return
    await trackerApi.updateMine(tracked.id, patch)
    qc.invalidateQueries({ queryKey: ['me', 'characters', 'detail', tracked.id] })
  }

  const handleToggleOwned = async () => {
    if (!catalogQuery.data) return
    if (!tracked) {
      // ДОБАВЛЕНИЕ
      try {
        await trackerApi.addMine(catalogQuery.data.id)
        await qc.invalidateQueries({ queryKey: ['me', 'characters'] })
        await qc.invalidateQueries({ queryKey: ['me', 'characters', 'detail'] })
      } catch (e: any) {
        alert(e.response?.data?.detail || 'Ошибка добавления')
      }
    } else {
      // УДАЛЕНИЕ (вызываем модалку)
      setShowDeleteConfirm(true)
    }
  }

  const confirmDelete = async () => {
    if (!tracked) return
    try {
      await trackerApi.deleteMine(tracked.id)
      await qc.invalidateQueries({ queryKey: ['me', 'characters'] })
      await qc.invalidateQueries({ queryKey: ['me', 'characters', 'detail'] })
      setShowDeleteConfirm(false)
      goTo(0) // Возвращаемся в первую зону
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const { draft, progress, isSaving, lastSaved, update } = useCharacterDraft({
    detail,
    onSave: handleSave,
  })

  // Если персонажа нет в трекере, доступна только 1 зона
  const totalZones = tracked ? 4 : 1
  const { current, goTo } = useSectionScroll(totalZones)
  const safeCurrent = Math.min(current, totalZones - 1)

  if (catalogQuery.isLoading) return <LoadingSpinner />
  if (catalogQuery.isError || !catalogQuery.data)
    return <ErrorState message="Персонаж не найден" />

  const character = catalogQuery.data

  return (
    <div className="relative h-screen w-full overflow-hidden select-none">
      <div
        className="transition-transform duration-700 ease-in-out"
        style={{ transform: `translateY(-${safeCurrent * 100}vh)` }}
      >
        <ZoneHero
          character={character}
          detail={detail}
          draft={draft}
          goTo={goTo}
          onToggleOwned={handleToggleOwned}
          isOwned={!!tracked}
          totalOverride={progress?.total}
          artifactSets={artifactSets}
          weapons={weapons}
          defaultWeapon={defaultWeapon}
          onSelectSlot={(key) => {
            setSelectedSlot(key)
            goTo(2)
          }}
        />
        <ZoneStats
          character={character}
          detail={detail}
          draft={draft}
          progress={progress}
          onUpdate={update}
          isSaving={isSaving}
          lastSaved={lastSaved}
          goTo={goTo}
        />
        <ZoneWeaponArtifacts
          character={character}
          detail={detail}
          draft={draft}
          progress={progress}
          onUpdate={update}
          goTo={goTo}
          isSaving={isSaving}
          lastSaved={lastSaved}
          artifactSets={artifactSets}
          weapons={weapons}
          defaultWeapon={defaultWeapon}
          weaponsQuery={weaponsQuery}
          selectedSlot={selectedSlot}
          setSelectedSlot={setSelectedSlot}
        />
        <ZoneConstellations
          character={character}
          draft={draft}
          onUpdate={update}
          isSaving={isSaving}
          lastSaved={lastSaved}
          goTo={goTo}
        />
      </div>
        {showDeleteConfirm && (
        <ConfirmDeleteModal
          characterName={character.name_ru || character.name}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
