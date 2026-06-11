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

// 材料單價($/m²)——m12 全生命週期成本用
export const MATERIAL_COST = {
  silicone: 500,
  pu: 1500,
  sheet: 3000,
}

// 每次進場固定成本($/m² 攤提):工資、假設工程、拆除清運
export const SETUP_COST = 2000

// 期間內的施作次數 = ceil(年數 / 壽命),含初次施作(至少 1 次)
export function setupCount(years, mat) {
  return Math.max(1, Math.ceil(years / MATERIAL_LIFE[mat]))
}

// 已重做次數(用於劣化視覺的周期重置)= floor(年數 / 壽命)
export function redoCount(years, mat) {
  return Math.floor(years / MATERIAL_LIFE[mat])
}

// 全生命週期成本 = 施作次數 ×(材料單價 + 進場成本)
export function lifetimeCost(years, mat) {
  return setupCount(years, mat) * (MATERIAL_COST[mat] + SETUP_COST)
}

// 拆分:材料成本 / 進場成本(堆疊長條圖用)
export function costBreakdown(years, mat) {
  const n = setupCount(years, mat)
  return { material: n * MATERIAL_COST[mat], setup: n * SETUP_COST, total: n * (MATERIAL_COST[mat] + SETUP_COST) }
}

// ── 高壓水槍檢測判定(m06 / m14 共用)──────────────
// 註:m06 因「不得改動已驗收檔案」仍保留同式的 inline 版本;此處數值與其完全一致,
// m14(3D 實測場)直接 import 這些函式,確保同參數同結果。
export const WATERJET_THRESH = 100 // 局部累積水量達此值即判定該處滲漏/弱點定位
// 單位時間累積水量:水壓越高、噴距越近,累積越快(對應 m06 的 rate 公式)
export function waterjetDoseRate(pressureKgf, distCm, dt) {
  return (pressureKgf / (1 + distCm * 0.12)) * dt * 6
}
// 水壓 > 100 → 過壓誤判風險(連完好填縫也會被打穿)
export function waterjetOverpressure(pressureKgf) {
  return pressureKgf > 100
}

export const G = 9.8 // 重力加速度(m/s²),2D 粒子引擎用
