import { create } from 'zustand'

// 全域狀態。currentKey=目前模組;completed=本次工作階段的完成度(key→最佳分數)。
// 進度為 in-session(重整即清空),不落地;之後接 Supabase 由 lab:complete 事件串接。
export const useStore = create((set) => ({
  currentKey: null,
  setCurrent: (key) => set({ currentKey: key }),
  clearCurrent: () => set({ currentKey: null }),

  completed: {},
  markComplete: (key, score) => set((s) => {
    const prev = s.completed[key] ?? -1
    if (score <= prev) return s
    return { completed: { ...s.completed, [key]: score } }
  }),
}))
