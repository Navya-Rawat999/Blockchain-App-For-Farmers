import { create } from 'zustand'

interface SettingsState {
  contractAddress?: `0x${string}`
  setContractAddress: (addr: `0x${string}`) => void
}

export const useSettings = create<SettingsState>((set) => ({
  contractAddress: undefined,
  setContractAddress: (addr) => set({ contractAddress: addr }),
}))
