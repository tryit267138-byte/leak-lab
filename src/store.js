import { create } from 'zustand'

// 全域狀態。Phase 1 僅需「目前選到的模組」。
// 之後階段(音效、進度、Supabase)再往上加,禁止 localStorage。
export const useStore = create((set) => ({
  currentKey: null,
  setCurrent: (key) => set({ currentKey: key }),
  clearCurrent: () => set({ currentKey: null }),
}))
