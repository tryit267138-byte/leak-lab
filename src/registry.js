// module_key → { meta, Component } 對照表。
// 2D 模組靜態 import;3D 模組(three.js)用 lazy + dynamic import 拆 chunk,
// meta 走輕量檔靜態載入,Component 延遲載入,不拖慢 2D 首次載入。
import { lazy } from 'react'
import * as m01 from './modules/m01-pressure/index.jsx'
import * as m02 from './modules/m02-capillary/index.jsx'
import * as m03 from './modules/m03-window/index.jsx'
import * as m04 from './modules/m04-condense/index.jsx'
import * as m05 from './modules/m05-inspector/index.jsx'
import * as m06 from './modules/m06-waterjet/index.jsx'
import * as m07 from './modules/m07-roofdrain/index.jsx'
import * as m08 from './modules/m08-balcony/index.jsx'
import * as m09 from './modules/m09-joint/index.jsx'
import * as m10 from './modules/m10-bathroom/index.jsx'
import * as m11 from './modules/m11-winddriven/index.jsx'
import * as m12 from './modules/m12-aging/index.jsx'
// 3D:只靜態載入 meta(輕量,不含 three.js)
import { meta as m13meta } from './modules/m13-building3d/meta.js'
import { meta as m14meta } from './modules/m14-sitetest3d/meta.js'

const mods = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12]

const lazyMods = [
  { meta: m13meta, Component: lazy(() => import('./modules/m13-building3d/index.jsx').then((m) => ({ default: m.Component }))), lazy: true },
  { meta: m14meta, Component: lazy(() => import('./modules/m14-sitetest3d/index.jsx').then((m) => ({ default: m.Component }))), lazy: true },
]

export const registry = [
  ...mods.map((m) => ({ meta: m.meta, Component: m.Component })),
  ...lazyMods,
]

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
