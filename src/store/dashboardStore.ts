import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface DashboardState {
  gciTarget: number
  gciCurrent: number
  listingsTarget: number
  listingsCurrent: number
  lapsTarget: number
  lapsCurrent: number
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      gciTarget: 4000000,
      gciCurrent: 2228884.64,
      listingsTarget: 110,
      listingsCurrent: 49,
      lapsTarget: 350,
      lapsCurrent: 167,
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    { name: 'DashboardStore' }
  )
)
