import { useRef, useState } from 'react'
import { ParticleField } from '../../engine/particles2d.js'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import shared from '../module.module.css'

export const meta = {
  key: 'm08-balcony',
  title: '陽台門檻與落水頭',
  category: '環境',
  description: '落水頭堵+暴雨→水位漫過門檻進室內。門檻是最後防線,向內坡是施工錯誤。',
  difficulty: 2,
}

const R = (a, b) => a + Math.random() * (b - a)
const FLOOR = 250, BX0 = 40, THX = 360, RX1 = 600
const CM = 4 // px per cm

export function Component() {
  const rain = useRef(new ParticleField(400)).current
  const spill = useRef(new ParticleField(200)).current
  const m = useRef({ th: 8, slope: 'out', blocked: false, storm: false, level: 0, indoorWet: 0, leak: 0 }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)
  const setTh = (v) => { m.th = v; flush() }
  const setSlope = (s) => { m.slope = s; flush() }
  const toggleBlock = () => { m.blocked = !m.blocked; flush() }
  const toggleStorm = () => { m.storm = !m.storm; flush() }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const inflow = m.storm ? 50 : 6
    let drainEff = m.blocked ? 0 : 60
    if (m.slope === 'out') drainEff *= 1.25
    if (m.slope === 'in') drainEff *= 0.4
    m.level = Math.max(0, Math.min(40, m.level + (inflow - drainEff) * dt))
    const thEff = Math.max(0, m.th - (m.slope === 'in' ? 3 : 0))
    const overtop = m.level > thEff
    if (overtop) {
      const rate = (m.level - thEff) * 0.5
      m.indoorWet = Math.min(1, m.indoorWet + rate * dt)
      m.leak += rate * dt
      if (Math.random() < rate * dt * 3) spill.emit({ x: THX + R(2, 14), y: FLOOR - thEff * CM, vx: 20, vy: 30, life: 1.5, r: 2 })
    } else {
      m.indoorWet = Math.max(0, m.indoorWet - dt * 0.15)
    }

    // 雨
    if (m.storm) for (let k = 0; k < 5; k++) rain.emit({ x: R(BX0, THX), y: -5, vx: 8, vy: R(200, 260), life: 1.5, r: 1.6 })
    rain.gravity = 40; rain.update(dt, (p) => p.y < FLOOR - m.level * CM)
    spill.gravity = 160; spill.update(dt)

    // ── 繪圖 ──
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, 620, 340)
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(THX, 0, RX1 - THX, 340) // 室內背景
    rain.draw(ctx, '#7cc4ee')
    // 陽台積水
    const surfY = FLOOR - m.level * CM
    if (m.level > 0.3) { ctx.fillStyle = 'rgba(74,163,255,0.45)'; ctx.fillRect(BX0, surfY, THX - BX0, FLOOR - surfY); ctx.fillStyle = '#6fb6e8'; ctx.fillRect(BX0, surfY, THX - BX0, 2) }
    // 室內地板濕痕
    if (m.indoorWet > 0.01) { ctx.fillStyle = `rgba(40,80,120,${m.indoorWet * 0.7})`; ctx.fillRect(THX + 16, FLOOR - 4, RX1 - THX - 16, 16) }
    spill.draw(ctx, '#5db2e8')
    // 樓板
    ctx.fillStyle = '#3a4350'; ctx.fillRect(0, FLOOR, 620, 14)
    ctx.fillStyle = '#2a3340'; ctx.fillRect(THX + 16, FLOOR - 4, RX1 - THX - 16, 4) // 室內地板略高
    // 門檻
    const thPx = m.th * CM
    ctx.fillStyle = '#5e646c'; ctx.fillRect(THX, FLOOR - thPx, 16, thPx)
    ctx.fillStyle = '#46c79a'; ctx.fillRect(THX, FLOOR - thPx, 16, 3)
    // 落水頭
    ctx.fillStyle = m.blocked ? '#ff8a78' : '#46c79a'; ctx.fillRect(110, FLOOR, 24, 12); ctx.fillStyle = '#0a0d10'; ctx.fillRect(118, FLOOR + 2, 8, 10)
    // 欄杆
    ctx.strokeStyle = '#5e646c'; ctx.lineWidth = 3
    for (let x = BX0; x <= BX0 + 30; x += 10) { ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x, FLOOR - 70); ctx.stroke() }
    ctx.beginPath(); ctx.moveTo(BX0, FLOOR - 70); ctx.lineTo(BX0 + 30, FLOOR - 70); ctx.stroke(); ctx.lineWidth = 1
    // 坡度箭頭
    ctx.fillStyle = '#ffd27b'; ctx.font = '12px sans-serif'
    const slopeTxt = m.slope === 'out' ? '洩水坡 → 向外(正確)' : m.slope === 'in' ? '洩水坡 ← 向內(施工錯誤)' : '無洩水坡'
    ctx.fillText(slopeTxt, 120, FLOOR + 36)
    // 標籤
    ctx.fillStyle = '#7d8c98'; ctx.fillText('陽台', BX0 + 60, 30); ctx.fillText('室內', THX + 40, 30)
    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'
    ctx.fillText(`陽台水位 ${m.level.toFixed(0)}cm / 門檻 ${m.th}cm`, 16, 22)
    if (overtop) { ctx.fillStyle = '#ff8a78'; ctx.fillText('⚠ 水位漫過門檻,灌入室內', THX - 200, surfY - 8) }

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  const overtop = m.level > Math.max(0, m.th - (m.slope === 'in' ? 3 : 0))
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: `落水頭堵塞 + 暴雨 → 陽台水位上升;一旦<b>水位 > 門檻高度</b>就漫進室內。門檻是<b>最後一道防線</b>。<b>向內</b>的洩水坡會把水導向室內,是典型施工錯誤。室內滲水累計 <b>${m.leak.toFixed(0)}</b>。` }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="門檻高度" value={m.th} min={0} max={15} unit=" cm" onChange={setTh} />
          <div style={{ height: 12 }} />
          <div className={shared.note} style={{ marginBottom: 6 }}>地坪坡度</div>
          <div className={shared.toggleRow}>
            <Button variant="toggle" active={m.slope === 'out'} onClick={() => setSlope('out')}>向外</Button>
            <Button variant="toggle" active={m.slope === 'none'} onClick={() => setSlope('none')}>無</Button>
            <Button variant="toggle" active={m.slope === 'in'} onClick={() => setSlope('in')}>向內</Button>
          </div>
          <div style={{ height: 12 }} />
          <div className={shared.toggleRow}>
            <Button variant="toggle" active={m.blocked} onClick={toggleBlock}>落水頭堵塞:{m.blocked ? '開' : '關'}</Button>
            <Button variant="toggle" active={m.storm} onClick={toggleStorm}>暴雨:{m.storm ? '開' : '關'}</Button>
          </div>
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '陽台水位', value: `${m.level.toFixed(0)}cm`, tone: overtop ? 'warn' : 'primary' },
            { label: '門檻', value: `${m.th}cm`, tone: 'normal' },
            { label: '漫入室內', value: overtop ? '是' : '否', tone: overtop ? 'warn' : 'normal' },
          ]} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}><b>門檻</b>不是裝飾,是陽台淹水時擋住水進室內的<b>最後防線</b>。門檻越低、落水頭越堵,越容易破防。</p>
          <p className={shared.note}>地坪要做<b>向外洩水坡</b>把水導向落水頭;做成<b>向內</b>是典型施工錯誤——等於主動把水送進室內。</p>
        </Panel>
      </div>
    </div>
  )
}
