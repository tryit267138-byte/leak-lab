// 模組「完成事件」:供 bqiat-learn 進度系統接收。
// window.dispatchEvent(new CustomEvent('lab:complete', { detail: { key, score } }))
// 每個 key 只在分數提升時再次發送,避免洗版;score 夾在 0~100。

const best = {}

export function emitComplete(key, score) {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  if (best[key] != null && s <= best[key]) return
  best[key] = s
  window.dispatchEvent(new CustomEvent('lab:complete', { detail: { key, score: s } }))
}
