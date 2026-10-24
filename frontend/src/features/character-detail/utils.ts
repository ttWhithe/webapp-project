export function getSetSlotIcon(set: any, slot: string) {
  if (!set) return null
  if (slot === 'flower') return set.icon_url
  if (slot === 'plume') return set.icon_plume_url
  if (slot === 'sands') return set.icon_sands_url
  if (slot === 'goblet') return set.icon_goblet_url
  if (slot === 'circlet') return set.icon_circlet_url
  return set.icon_url
}
