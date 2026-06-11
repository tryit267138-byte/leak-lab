import { useRef, useState } from 'react'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Hud } from '../../ui/Hud.jsx'
import { emitComplete } from '../../engine/labEvents.js'
import shared from '../module.module.css'

export const meta = {
  key: 'm02-capillary',
  title: '毛細現象',
  category: '水路',
  description: '縫越細,水沿縫逆重力爬得越高。髮絲裂縫(0.2mm)比明顯裂縫更危險。',
  difficulty: 1,
}

export function Component() {
  const m = useRef({ cur: [0, 0, 0], d: 1 }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const setD = (v) => { m.d = v; if (v <= 0.3) emitComplete('m02-capillary', 100); setTick((t) => t + 1) }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const ws = [2.0, m.d, 0.2] // mm
    const targets = ws.map((w) => Math.min(220, 15 / w * 1.5)) // px(1.5px=1mm)
    m.cur = m.cur.map((c, i) => c + (targets[i] - c) * 0.03)
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, 620, 340)
    const WY = 280
    const g = ctx.createLinearGradient(0, WY, 0, 335); g.addColorStop(0, '#3a8fd4'); g.addColorStop(1, '#1c4a7a')
    ctx.fillStyle = g; ctx.fillRect(10, WY, 600, 55)
    ctx.fillStyle = '#6fb6e8'; ctx.fillRect(10, WY, 600, 3)
    const cxs = [150, 310, 470], names = ['一般裂縫', '你調的裂縫', '髮絲裂縫']
    cxs.forEach((cx, i) => {
      const slitPx = Math.max(2, ws[i] * 6)
      ctx.fillStyle = '#5e646c'
      ctx.fillRect(cx - 65, 55, 65 - slitPx / 2, WY - 55)
      ctx.fillRect(cx + slitPx / 2, 55, 65 - slitPx / 2, WY - 55)
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      for (let y = 65; y < WY; y += 16) ctx.fillRect(cx - 65, y, 130, 1)
      const h = m.cur[i]
      ctx.fillStyle = '#4aa3df'; ctx.fillRect(cx - slitPx / 2, WY - h, slitPx, h + 2)
      ctx.beginPath(); ctx.ellipse(cx, WY - h, slitPx / 2 + 1, 3, 0, 0, 7); ctx.fillStyle = '#7cc4ee'; ctx.fill()
      ctx.fillStyle = i === 1 ? '#66D3C0' : '#8fa0ad'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(names[i], cx, 40)
      ctx.font = '12px sans-serif'
      ctx.fillText(`縫寬 ${ws[i].toFixed(1)}mm`, cx, WY + 24)
      const hmm = Math.min(150, 15 / ws[i])
      ctx.fillText(`爬升 ${hmm >= 150 ? '150+' : hmm.toFixed(0)} mm`, cx, WY + 40)
      ctx.textAlign = 'left'
      ctx.strokeStyle = 'rgba(255,210,123,0.5)'; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(cx - 72, WY - h); ctx.lineTo(cx + 72, WY - h); ctx.stroke(); ctx.setLineDash([])
    })
    ctx.fillStyle = '#7d8c98'; ctx.font = '12px sans-serif'
    ctx.fillText('h ≈ 15 / d(mm)　水的表面張力 + 附著力 > 重力', 20, 20)

    acc.current += dt; if (acc.current > 0.2) { acc.current = 0; setTick((t) => t + 1) }
  })

  const hmm = Math.min(150, 15 / m.d)
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="中間裂縫寬度" value={m.d} min={0.1} max={5} step={0.1} unit=" mm" onChange={setD} />
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '縫寬 d', value: `${m.d.toFixed(1)} mm`, tone: 'primary' },
            { label: '爬升 h', value: hmm >= 150 ? '150+ mm' : `${hmm.toFixed(0)} mm`, tone: 'hint' },
          ]} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}>
            毛細爬升高度 <b>h ≈ 15 ÷ 縫寬(mm)</b>。縫越細,水爬越高——這就是為什麼<b>髮絲裂縫(0.2mm)比明顯裂縫更危險</b>:理論爬升 150mm 以上,牆腳水可以默默吸到牆體深處。
          </p>
          <p className={shared.note}>
            壁癌常見於牆腳 30~90cm,正是毛細水帶著鹽分上來析晶的範圍。
          </p>
        </Panel>
      </div>
    </div>
  )
}
