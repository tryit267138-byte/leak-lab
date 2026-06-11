// 物理常數與公式集中地 —— 全站唯一來源。
// 規格鐵則:以下明列公式與數值禁止改動,五模組一律 import 此檔。
// 凡規格未明列、原應由 reference/lab-v1.html 提供的數字,標 ⚠ 待原型核對。

// ── 毛細上升高度 ───────────────────────────────
// h ≈ 15 / d   ；h: 上升高度(cm),d: 縫隙/孔徑寬度(mm)
export function capillaryRise(d) {
  if (d <= 0) return Infinity
  return 15 / d
}

// ── 風壓 ──────────────────────────────────────
// P = v² / 16  ；P: 風壓(kgf/m²),v: 風速(m/s)
export function windPressure(v) {
  return (v * v) / 16
}

// ── 露點溫度 ───────────────────────────────────
// Td = T - (100 - RH) / 5 ；T: 氣溫(°C),RH: 相對濕度(%)
export function dewPoint(T, RH) {
  return T - (100 - RH) / 5
}

// 牆面溫度低於露點即結露
export function willCondense(surfaceTemp, airTemp, RH) {
  return surfaceTemp <= dewPoint(airTemp, RH)
}

// ── 窗/門窗水密性等級(CNS)──────────────────────
// 數值即「可抵抗的風雨壓(kgf/m²)」門檻;風壓超過等級 → 滲水
export const WATERTIGHT_GRADES = [10, 15, 25, 35, 50]

// 給定窗等級與風速,回傳是否滲水及超壓比例
export function windowLeaks(grade, windSpeed) {
  const p = windPressure(windSpeed)
  return { pressure: p, leaks: p > grade, ratio: p / grade }
}

// ── 材料壽命(年)——定案值,m12 加速老化試驗用 ──────
// 註:原型遊戲裡的 12/32「秒」是遊戲時間,非真實壽命,勿混用。
export const MATERIAL_LIFE = {
  silicone: 5,  // 矽利康填縫
  pu: 8,        // PU 防水塗膜
  sheet: 15,    // 複合防水毯
}

// 每次重做單價($/m²)——m12 全生命週期成本用
export const MATERIAL_COST = {
  silicone: 500,
  pu: 1500,
  sheet: 3000,
}

// 失效即需重做,重做次數 = floor(年數 / 壽命)
export function redoCount(years, mat) {
  return Math.floor(years / MATERIAL_LIFE[mat])
}

// 總持有成本 = 重做次數 × 單價
export function lifetimeCost(years, mat) {
  return redoCount(years, mat) * MATERIAL_COST[mat]
}

export const G = 9.8 // 重力加速度(m/s²),2D 粒子引擎用
