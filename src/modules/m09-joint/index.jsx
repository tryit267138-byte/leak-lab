import { useRef, useState } from 'react'
import { ParticleField } from '../../engine/particles2d.js'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import shared from '../module.module.css'

export const meta = {
  key: 'm09-joint',
  title: '層縫/施工縫滲透',
  category: '水路',
  description: '水沿水平冷縫橫向跑,在離進水點很遠處滴出。漏的位置 ≠ 進水的位置。',
  difficulty: 3,
}

const R = (a, b) => a + Math.random() * (b - a)
const JY = 175 // 冷縫高度
const PXM = 80 // px per 公尺

function genCase() {
  const xEntry = R(110, 240)
  const distM = R(1, 3)
  const xExit = Math.min(560, xEntry + distM * PXM)
  return { xEntry, xExit, distM }
}

export function Component() {
  const drip = useRef(new ParticleField(300)).current
  const flow = useRef(new ParticleField(300)).current
  const m = useRef({ band: false, density: 70, rain: 60, ...genCase(), leak: 0, t: 0 }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)
  const setDensity = (v) => { m.density = v; flush() }
  const setRain = (v) => { m.rain = v; flush() }
  const toggleBand = () => { m.band = !m.band; flush() }
  const newCase = () => { Object.assign(m, genCase()); m.leak = 0; drip.clear(); flow.clear(); flush() }

  const { ref } = useFixedCanvas((ctx, dt) => {
    m.t += dt
    const leaking = !m.band && m.density < (50 + m.rain * 0.3)
    // 沿縫橫向流動的水
    if (leaking && Math.random() < 0.5) flow.emit({ x: m.xEntry, y: JY, vx: (m.xExit - m.xEntry) / 1.4, vy: 0, life: 1.4, r: 1.8 })
    flow.gravity = 0; flow.update(dt, (p) => p.x < m.xExit)
    // 出水點滴落
    if (leaking && Math.random() < 0.25) { drip.emit({ x: m.xExit + R(-3, 3), y: JY + 6, vy: 30, life: 2, r: 2 }); m.leak += 0.25 }
    drip.gravity = 160; drip.update(dt)

    // ── 繪圖 ──
    ctx.fillStyle = '#262d34'; ctx.fillRect(0, 0, 620, JY)        // 上層牆
    ctx.fillStyle = '#21272d'; ctx.fillRect(0, JY + 10, 620, 340) // 下層牆
    ctx.fillStyle = '#7d8c98'; ctx.font = '12px sans-serif'
    ctx.fillText('上層', 16, 24); ctx.fillText('下層', 16, JY + 32)
    // 冷縫(樓板交界)
    ctx.fillStyle = '#11161b'; ctx.fillRect(0, JY, 620, 10)
    if (m.band) { ctx.fillStyle = '#46c79a'; ctx.fillRect(0, JY + 3, 620, 4) }
    // 雨(外側)
    ctx.strokeStyle = 'rgba(120,180,230,0.5)'; ctx.lineWidth = 1
    for (let i = 0; i < Math.round(m.rain / 5); i++) { const x = (i * 67 + m.t * 200) % 620; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 6, 14); ctx.stroke() }
    // 完整水路虛線
    ctx.strokeStyle = leaking ? 'rgba(255,138,120,0.8)' : 'rgba(140,160,175,0.4)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(m.xEntry, 0); ctx.lineTo(m.xEntry, JY); ctx.lineTo(m.xExit, JY); ctx.lineTo(m.xExit, 300); ctx.stroke(); ctx.setLineDash([])
    flow.draw(ctx, '#7cc4ee'); drip.draw(ctx, '#5db2e8')
    // 進水點 / 出水點
    ctx.fillStyle = '#ffd27b'; ctx.beginPath(); ctx.arc(m.xEntry, JY, 5, 0, 7); ctx.fill()
    ctx.font = '12px sans-serif'; ctx.fillText('進水點', m.xEntry - 18, JY - 8)
    if (leaking) {
      ctx.fillStyle = '#ff8a78'; ctx.beginPath(); ctx.arc(m.xExit, 300, 6, 0, 7); ctx.fill()
      ctx.fillText('出水點(漏在這)', m.xExit - 30, 320)
    }
    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'
    ctx.fillText(`進水→出水 水平距離 ${m.distM.toFixed(1)} m`, 16, JY - 28)

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  const leaking = !m.band && m.density < (50 + m.rain * 0.3)
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: `無止水帶 + 縫內密實度低 → 水沿<b>水平冷縫</b>橫向跑,在離進水點 <b>${m.distM.toFixed(1)} m</b> 的地方才滴出來。<b class="bad">漏的位置 ≠ 進水的位置</b>——抓漏最重要的觀念:水會跑,別只盯著滴水處挖。` }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <div className={shared.toggleRow}>
            <Button variant="toggle" active={m.band} onClick={toggleBand}>止水帶:{m.band ? '有' : '無'}</Button>
            <Button variant="ghost" onClick={newCase}>下一題</Button>
          </div>
          <div style={{ height: 12 }} />
          <Slider label="縫內密實度" value={m.density} min={50} max={100} unit=" %" onChange={setDensity} />
          <div style={{ height: 12 }} />
          <Slider label="外側風雨強度" value={m.rain} min={0} max={100} unit="" onChange={setRain} />
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '水平距離', value: `${m.distM.toFixed(1)}m`, tone: 'primary' },
            { label: '止水帶', value: m.band ? '有' : '無', tone: m.band ? 'normal' : 'warn' },
            { label: '狀態', value: leaking ? '滲漏中' : '止水', tone: leaking ? 'warn' : 'normal' },
          ]} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}>樓層交界的<b>水平施工縫(冷縫)</b>是水的高速公路。沒做<b>止水帶</b>、縫內不密實,水會沿縫橫向移動。</p>
          <p className={shared.note}>所以<b>漏的位置常常不是進水的位置</b>。抓漏要追水路、做灑水試驗找真正進水點,不能只在滴水處猛挖。</p>
        </Panel>
      </div>
    </div>
  )
}
