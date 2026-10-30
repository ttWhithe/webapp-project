import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  usePremiumImages: boolean
  togglePremiumImages: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      usePremiumImages: false,
      togglePremiumImages: () => set((state) => ({ usePremiumImages: !state.usePremiumImages })),
    }),
    { name: 'gpt-settings' } // Сохраняется в localStorage
  )
)
