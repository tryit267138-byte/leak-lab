import { useRef, useState } from 'react'
import { ParticleField } from '../../engine/particles2d.js'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { MATERIAL_LIFE, redoCount, lifetimeCost } from '../../engine/physics.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Hud } from '../../ui/Hud.jsx'
import shared from '../module.module.css'

export const meta = {
  key: 'm12-aging',
  title: '防水層加速老化試驗',
  category: '材料',
  description: '三材料隨時間劣化,比較 15 年全生命週期持有成本。',
  difficulty: 2,
}

const MATS = [
  { key: 'silicone', name: '矽利康', mode: '粉化' },
  { key: 'pu', name: 'PU 塗膜', mode: '龜裂' },
  { key: 'sheet', name: '防水毯', mode: '硬化' },
]
const PANEL = { w: 150, h: 116, top: 44 }
const COL_X = [55, 235, 415]

export function Component() {
  const dust = useRef(new ParticleField(300)).current
  const m = useRef({ year: 0 }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const setYear = (v) => { m.year = v; setTick((t) => t + 1) }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const yr = m.year
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, 620, 340)

    MATS.forEach((mat, i) => {
      const x = COL_X[i], life = MATERIAL_LIFE[mat.key]
      const cycles = redoCount(yr, mat.key)
      const ageInCycle = yr - cycles * life
      const frac = Math.min(1, ageInCycle / life) // 本周期劣化程度
      const failed = ageInCycle >= life - 0.01 && yr >= life

      // 試片底
      ctx.fillStyle = '#3a4350'; ctx.fillRect(x, PANEL.top, PANEL.w, PANEL.h)
      // 劣化視覺
      if (mat.key === 'silicone') {
        // 粉化:表面變灰白 + 飄粉
        ctx.fillStyle = `rgba(220,220,210,${frac * 0.5})`; ctx.fillRect(x, PANEL.top, PANEL.w, PANEL.h)
        if (frac > 0.5 && Math.random() < frac * 0.4) dust.emit({ x: x + Math.random() * PANEL.w, y: PANEL.top + PANEL.h, vy: -Math.random() * 10, vx: (Math.random() - 0.5) * 8, life: 1.2, r: 1.3 })
      } else if (mat.key === 'pu') {
        // 龜裂:裂紋數 ∝ frac
        ctx.strokeStyle = `rgba(10,12,16,${0.3 + frac * 0.6})`; ctx.lineWidth = 1
        const n = Math.round(frac * 14)
        for (let k = 0; k < n; k++) {
          const sx = x + ((k * 53) % PANEL.w), sy = PANEL.top + ((k * 89) % PANEL.h)
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 18 - (k % 3) * 9, sy + 14); ctx.lineTo(sx + 26, sy + 4); ctx.stroke()
        }
      } else {
        // 硬化:顏色變深、邊緣捲起
        ctx.fillStyle = `rgba(20,20,15,${frac * 0.6})`; ctx.fillRect(x, PANEL.top, PANEL.w, PANEL.h)
        if (frac > 0.5) { ctx.fillStyle = '#21272d'; ctx.beginPath(); ctx.moveTo(x, PANEL.top); ctx.lineTo(x + 30 * frac, PANEL.top); ctx.lineTo(x, PANEL.top + 30 * frac); ctx.closePath(); ctx.fill() }
      }
      ctx.strokeStyle = '#5e646c'; ctx.lineWidth = 1; ctx.strokeRect(x, PANEL.top, PANEL.w, PANEL.h)

      // 標題 / 狀態
      ctx.fillStyle = i === 0 ? '#66D3C0' : '#dfe7ee'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`${mat.name}(壽命${life}年)`, x + PANEL.w / 2, PANEL.top - 12)
      ctx.font = '12px sans-serif'; ctx.fillStyle = '#7d8c98'
      ctx.fillText(`劣化:${mat.mode}`, x + PANEL.w / 2, PANEL.top + PANEL.h + 18)
      if (failed) { ctx.fillStyle = '#ff8a78'; ctx.font = '13px sans-serif'; ctx.fillText('⚠ 失效', x + PANEL.w / 2, PANEL.top + PANEL.h / 2) }
      ctx.fillStyle = '#ffd27b'; ctx.font = '12px sans-serif'; ctx.fillText(`已重做 ${cycles} 次`, x + PANEL.w / 2, PANEL.top + PANEL.h + 34)
      ctx.textAlign = 'left'
    })
    dust.gravity = -8; dust.update(dt); dust.draw(ctx, '#dcdcd2')

    // 成本長條圖
    const costs = MATS.map((mat) => lifetimeCost(yr, mat.key))
    const maxCost = Math.max(3000, ...costs)
    const baseY = 316, barW = 60
    ctx.fillStyle = '#7d8c98'; ctx.font = '12px sans-serif'; ctx.fillText(`${yr.toFixed(1)} 年總持有成本($/m²)`, 16, 212)
    MATS.forEach((mat, i) => {
      const c = costs[i], h = (c / maxCost) * 78, x = COL_X[i] + 40
      ctx.fillStyle = ['#66D3C0', '#7cc4ee', '#ffd27b'][i]; ctx.fillRect(x, baseY - h, barW, h)
      ctx.fillStyle = '#dfe7ee'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`$${c}`, x + barW / 2, baseY - h - 6); ctx.textAlign = 'left'
    })

    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'; ctx.fillText(`時間軸:${yr.toFixed(1)} 年`, 16, 22)
    acc.current += dt; if (acc.current > 0.15) { acc.current = 0; setTick((t) => t + 1) }
  })

  const costs = MATS.map((mat) => ({ name: mat.name, c: lifetimeCost(m.year, mat.key), n: redoCount(m.year, mat.key) }))
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: `拖動時間軸看三種材料如何劣化、各自重做幾次。<b>全生命週期成本</b>= 重做次數 × 單價:壽命短的材料(矽利康每 5 年一次)看似便宜,長期累加可能追上或超過耐久材料——選材要算 15 年總帳,不是只看單價。` }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="時間軸(快轉)" value={m.year} min={0} max={15} step={0.5} unit=" 年" onChange={setYear} />
        </Panel>
        <Panel title="15 年總持有成本">
          <Hud items={costs.map((c, i) => ({ label: `${c.name}×${c.n}`, value: `$${c.c}`, tone: i === 0 ? 'primary' : i === 1 ? 'hint' : 'normal' }))} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}>單價最便宜的材料不一定最省。<b>矽利康</b>壽命短(5年),15 年內要重做好幾次;<b>防水毯</b>單價高但耐久,重做少。</p>
          <p className={shared.note}>選材要看<b>全生命週期成本</b>(重做次數 × 單價),不是只看一次性單價——這正是防水保衛戰的核心教訓。</p>
        </Panel>
      </div>
    </div>
  )
}
