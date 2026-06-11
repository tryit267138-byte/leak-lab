import { useRef, useState } from 'react'
import { ParticleField } from '../../engine/particles2d.js'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { MATERIAL_LIFE, redoCount, setupCount, costBreakdown } from '../../engine/physics.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Hud } from '../../ui/Hud.jsx'
import { emitComplete } from '../../engine/labEvents.js'
import shared from '../module.module.css'

export const meta = {
  key: 'm12-aging',
  title: '防水層加速老化試驗',
  category: '材料',
  description: '三材料隨時間劣化,比較 15 年全生命週期持有成本(材料 + 進場)。',
  difficulty: 2,
}

const MATS = [
  { key: 'silicone', name: '矽利康', mode: '粉化' },
  { key: 'pu', name: 'PU 塗膜', mode: '龜裂' },
  { key: 'sheet', name: '防水毯', mode: '硬化' },
]
const COLORS = ['#66D3C0', '#7cc4ee', '#ffd27b']
const PANEL = { w: 150, h: 100, top: 58 }
const COL_X = [55, 235, 415]

export function Component() {
  const dust = useRef(new ParticleField(300)).current
  const m = useRef({ year: 0 }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const setYear = (v) => { m.year = v; if (v >= 15) emitComplete('m12-aging', 100); setTick((t) => t + 1) }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const yr = m.year
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, 620, 340)
    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'; ctx.fillText(`時間軸:${yr.toFixed(1)} 年`, 16, 18)
    ctx.fillStyle = '#7d8c98'; ctx.font = '11px sans-serif'; ctx.fillText('成本為示意參數,實際依現場規模調整', 16, 34)

    MATS.forEach((mat, i) => {
      const x = COL_X[i], life = MATERIAL_LIFE[mat.key]
      const cycles = redoCount(yr, mat.key)
      const ageInCycle = yr - cycles * life
      const frac = Math.min(1, ageInCycle / life)
      const failed = ageInCycle >= life - 0.01 && yr >= life
      const setups = setupCount(yr, mat.key)

      ctx.fillStyle = '#3a4350'; ctx.fillRect(x, PANEL.top, PANEL.w, PANEL.h)
      if (mat.key === 'silicone') {
        ctx.fillStyle = `rgba(220,220,210,${frac * 0.5})`; ctx.fillRect(x, PANEL.top, PANEL.w, PANEL.h)
        if (frac > 0.5 && Math.random() < frac * 0.4) dust.emit({ x: x + Math.random() * PANEL.w, y: PANEL.top + PANEL.h, vy: -Math.random() * 10, vx: (Math.random() - 0.5) * 8, life: 1.2, r: 1.3 })
      } else if (mat.key === 'pu') {
        ctx.strokeStyle = `rgba(10,12,16,${0.3 + frac * 0.6})`; ctx.lineWidth = 1
        const n = Math.round(frac * 12)
        for (let k = 0; k < n; k++) {
          const sx = x + ((k * 53) % PANEL.w), sy = PANEL.top + ((k * 89) % PANEL.h)
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 18 - (k % 3) * 9, sy + 12); ctx.lineTo(sx + 26, sy + 4); ctx.stroke()
        }
      } else {
        ctx.fillStyle = `rgba(20,20,15,${frac * 0.6})`; ctx.fillRect(x, PANEL.top, PANEL.w, PANEL.h)
        if (frac > 0.5) { ctx.fillStyle = '#21272d'; ctx.beginPath(); ctx.moveTo(x, PANEL.top); ctx.lineTo(x + 28 * frac, PANEL.top); ctx.lineTo(x, PANEL.top + 28 * frac); ctx.closePath(); ctx.fill() }
      }
      ctx.strokeStyle = '#5e646c'; ctx.lineWidth = 1; ctx.strokeRect(x, PANEL.top, PANEL.w, PANEL.h)

      ctx.fillStyle = i === 0 ? '#66D3C0' : '#dfe7ee'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`${mat.name}(壽命${life}年)`, x + PANEL.w / 2, PANEL.top - 10)
      ctx.font = '12px sans-serif'; ctx.fillStyle = '#7d8c98'
      ctx.fillText(`劣化:${mat.mode}`, x + PANEL.w / 2, PANEL.top + PANEL.h + 16)
      if (failed) { ctx.fillStyle = '#ff8a78'; ctx.font = '13px sans-serif'; ctx.fillText('⚠ 失效', x + PANEL.w / 2, PANEL.top + PANEL.h / 2) }
      ctx.fillStyle = '#ffd27b'; ctx.font = '12px sans-serif'; ctx.fillText(`已施作 ${setups} 次`, x + PANEL.w / 2, PANEL.top + PANEL.h + 32)
      ctx.textAlign = 'left'
    })
    dust.gravity = -8; dust.update(dt); dust.draw(ctx, '#dcdcd2')

    // ── 堆疊長條圖:材料(實色)+ 進場(斜紋半透明)──
    const bd = MATS.map((mat) => costBreakdown(yr, mat.key))
    const maxTotal = Math.max(5000, ...bd.map((b) => b.total))
    const baseY = 316, barW = 60, maxH = 74
    ctx.fillStyle = '#dfe7ee'; ctx.font = '12px sans-serif'; ctx.fillText(`${yr.toFixed(1)} 年總持有成本($/m²)`, 16, 206)
    // 圖例
    ctx.fillStyle = '#9aa6ad'; ctx.fillRect(300, 197, 11, 11)
    ctx.fillStyle = '#7d8c98'; ctx.fillText('材料', 315, 207)
    ctx.fillStyle = '#9aa6ad'; ctx.globalAlpha = 0.35; ctx.fillRect(370, 197, 11, 11); ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(370, 208); ctx.lineTo(381, 197); ctx.stroke()
    ctx.fillStyle = '#7d8c98'; ctx.fillText('進場', 385, 207)

    MATS.forEach((mat, i) => {
      const b = bd[i], x = COL_X[i] + 40, col = COLORS[i]
      const matH = (b.material / maxTotal) * maxH
      const setH = (b.setup / maxTotal) * maxH
      // 材料(實色,底)
      ctx.fillStyle = col; ctx.fillRect(x, baseY - matH, barW, matH)
      // 進場(半透明 + 斜紋,疊上)
      const sy = baseY - matH - setH
      ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.fillRect(x, sy, barW, setH); ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1
      for (let d = -setH; d < barW; d += 7) { ctx.beginPath(); ctx.moveTo(x + Math.max(0, d), sy + Math.max(0, -d)); ctx.lineTo(x + Math.min(barW, d + setH), sy + Math.min(setH, barW - d)); ctx.stroke() }
      // 總額
      ctx.fillStyle = '#dfe7ee'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`$${b.total}`, x + barW / 2, sy - 6); ctx.textAlign = 'left'
    })

    acc.current += dt; if (acc.current > 0.15) { acc.current = 0; setTick((t) => t + 1) }
  })

  const rows = MATS.map((mat) => ({ name: mat.name, b: costBreakdown(m.year, mat.key), n: setupCount(m.year, mat.key) }))
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: `<b>材料只是成本的一半</b>——每次重做都要再付一次工資與假設工程(進場成本)。便宜材料 15 年進場 <b>3 次</b>,總成本反而最高。拖動時間軸,看堆疊長條圖裡「貴在哪裡」。` }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="時間軸(快轉)" value={m.year} min={0} max={15} step={0.5} unit=" 年" onChange={setYear} />
        </Panel>
        <Panel title="15 年總持有成本">
          <Hud items={rows.map((r, i) => ({ label: `${r.name}×${r.n}`, value: `$${r.b.total}`, tone: i === 0 ? 'primary' : i === 1 ? 'hint' : 'normal' }))} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}><b>材料只是成本的一半。</b>每次重做都要再付一次工資與假設工程(進場成本約 $2000/m²)。便宜材料壽命短、進場次數多,這筆固定成本一次次累加。</p>
          <p className={shared.note}>所以<b>便宜材料 15 年進場 3 次,總成本反而最高</b>。選材要算<b>全生命週期成本(材料 + 進場)</b>——這正是防水保衛戰的核心教訓。</p>
        </Panel>
      </div>
    </div>
  )
}
