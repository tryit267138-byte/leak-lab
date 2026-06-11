// module_key → { meta, Component } 對照表。
// 新增模組:在此 import 並加入陣列即可,App 會自動依 category 分組顯示。
import * as m01 from './modules/m01-pressure/index.jsx'
import * as m02 from './modules/m02-capillary/index.jsx'
import * as m03 from './modules/m03-window/index.jsx'
import * as m04 from './modules/m04-condense/index.jsx'
import * as m05 from './modules/m05-inspector/index.jsx'
import * as m06 from './modules/m06-waterjet/index.jsx'
import * as m07 from './modules/m07-roofdrain/index.jsx'
import * as m08 from './modules/m08-balcony/index.jsx'
import * as m09 from './modules/m09-joint/index.jsx'

const mods = [m01, m02, m03, m04, m05, m06, m07, m08, m09]

export const registry = mods.map((m) => ({ meta: m.meta, Component: m.Component }))

export const byKey = Object.fromEntries(registry.map((r) => [r.meta.key, r]))

// 分類顯示順序
export const CATEGORY_ORDER = ['壓力', '水路', '環境', '檢測', '材料', '3D']

export function grouped() {
  const g = {}
  for (const r of registry) {
    ;(g[r.meta.category] ||= []).push(r)
  }
  return CATEGORY_ORDER
    .filter((c) => g[c])
    .map((c) => ({ category: c, items: g[c] }))
}
