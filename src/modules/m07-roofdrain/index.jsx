import { useRef, useState } from 'react'
import { ParticleField } from '../../engine/particles2d.js'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import { sfx } from '../../engine/audio.js'
import { emitComplete } from '../../engine/labEvents.js'
import shared from '../module.module.css'

export const meta = {
  key: 'm07-roofdrain',
  title: '屋頂積水與排水',
  category: '壓力',
  description: '坡度→排水→積水深度→水壓→滲漏量的連鎖。1% 坡度不是裝飾。',
  difficulty: 2,
}

const R = (a, b) => a + Math.random() * (b - a)
const DRAIN = [{ cap: 70, label: '通暢', c: '#46c79a' }, { cap: 30, label: '半堵', c: '#ffd27b' }, { cap: 0, label: '全堵', c: '#ff8a78' }]
const SCALE = 0.8 // px per mm

export function Component() {
  const rain = useRef(new ParticleField(500)).current
  const drip = useRef(new ParticleField(300)).current
  const m = useRef({ slope: 1, rainI: 60, dL: 0, dR: 0, depth: 0, leak: 0 }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)
  const setSlope = (v) => { m.slope = v; flush() }
  const setRain = (v) => { m.rainI = v; flush() }
  const cycL = () => { m.dL = (m.dL + 1) % 3; flush() }
  const cycR = () => { m.dR = (m.dR + 1) % 3; flush() }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const slope = m.slope
    const rise = slope * 14
    const ryLow = 210, ryHigh = ryLow - rise
    const roofY = (x) => ryHigh + (x - 60) / 500 * (ryLow - ryHigh)
    const leftSill = rise / SCALE
    const capR = DRAIN[m.dR].cap, capL = DRAIN[m.dL].cap
    const reach = 0.25 + (slope / 3) * 0.75
    const inflow = m.rainI * 0.8
    const outflow = (capR + (m.depth > leftSill ? capL : 0)) * reach
    m.depth = Math.max(0, Math.min(150, m.depth + (inflow - outflow) * dt))

    const yWater = ryLow - m.depth * SCALE
    const crackX = 300, crackY = roofY(crackX)
    const covered = crackY > yWater
    const leakRate = covered ? m.depth * 0.02 : 0

    // 雨
    for (let k = 0; k < Math.round(m.rainI / 12); k++) rain.emit({ x: R(40, 580), y: -5, vy: R(180, 240), life: 2, r: 1.6 })
    rain.gravity = 60
    rain.update(dt, (p) => p.y < roofY(p.x))
    // 滲漏水滴
    if (covered && !m.notified) { m.notified = true; emitComplete('m07-roofdrain', 100) }
    if (Math.random() < leakRate) { drip.emit({ x: crackX + R(-3, 3), y: crackY + 8, vy: 40, life: 2.2, r: 2 }); m.leak += leakRate }
    if (leakRate > 0 && Math.random() < 0.04) sfx.drop()
    drip.gravity = 180
    drip.update(dt)

    // ── 繪圖 ──
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, 620, 340)
    rain.drawTrails(ctx, '#7cc4ee')
    // 積水(水平水面;水覆蓋屋面較低的一側)
    if (m.depth > 0.5) {
      let xi = Math.abs(ryLow - ryHigh) < 0.5 ? 60 : 60 + (yWater - ryHigh) * 500 / (ryLow - ryHigh)
      xi = Math.max(60, Math.min(560, xi))
      ctx.fillStyle = 'rgba(74,163,255,0.45)'
      ctx.beginPath()
      ctx.moveTo(xi, yWater)
      ctx.lineTo(560, yWater)
      ctx.lineTo(560, roofY(560))
      ctx.lineTo(xi, roofY(xi))
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#6fb6e8'; ctx.fillRect(xi, yWater, 560 - xi, 2)
    }
    // 屋面板
    ctx.strokeStyle = '#5e646c'; ctx.lineWidth = 12; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(60, roofY(60)); ctx.lineTo(560, roofY(560)); ctx.stroke()
    ctx.lineWidth = 1; ctx.lineCap = 'butt'
    // 裂縫
    ctx.fillStyle = covered ? '#ff8a78' : '#101418'; ctx.fillRect(crackX - 3, crackY - 2, 6, 8)
    // 落水頭(左高右低)
    const drawDrain = (x, ry, st) => { ctx.fillStyle = DRAIN[st].c; ctx.fillRect(x - 10, ry + 6, 20, 10); ctx.fillStyle = '#0a0d10'; ctx.fillRect(x - 4, ry + 8, 8, 8) }
    drawDrain(60, roofY(60), m.dL); drawDrain(560, roofY(560), m.dR)
    // 室內天花
    ctx.fillStyle = '#1a1f25'; ctx.fillRect(0, 300, 620, 40)
    drip.drawTrails(ctx, '#5db2e8')
    if (covered) { ctx.fillStyle = '#ff8a78'; ctx.font = '12px sans-serif'; ctx.fillText('天花板滲水', crackX + 10, 320) }

    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'
    ctx.fillText(`坡度 ${slope.toFixed(1)}%　積水深度 ${m.depth.toFixed(0)} mm`, 16, 22)

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: `積水深度越深 → 正水壓越大 → 裂縫滲漏量越大。<b>1% 坡度</b>不是裝飾,是讓水「走得掉」的關鍵;落水頭一堵,整個連鎖就啟動。目前滲漏累計 <b>${m.leak.toFixed(0)}</b>。` }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="排水坡度" value={m.slope} min={0} max={3} step={0.1} unit=" %" onChange={setSlope} />
          <div style={{ height: 12 }} />
          <Slider label="降雨強度" value={m.rainI} min={0} max={100} unit="" onChange={setRain} />
          <div style={{ height: 14 }} />
          <div className={shared.toggleRow}>
            <Button variant="toggle" onClick={cycL}>左落水頭:{DRAIN[m.dL].label}</Button>
            <Button variant="toggle" onClick={cycR}>右落水頭:{DRAIN[m.dR].label}</Button>
          </div>
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '坡度', value: `${m.slope.toFixed(1)}%`, tone: 'primary' },
            { label: '積水深度', value: `${m.depth.toFixed(0)}mm`, tone: m.depth > 40 ? 'warn' : 'normal' },
            { label: '滲漏累計', value: m.leak.toFixed(0), tone: m.leak > 0 ? 'warn' : 'normal' },
          ]} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}>屋頂排不掉的水會<b>積起來</b>,積水深度就是壓在防水層上的<b>正水壓</b>——越深、壓越大、從裂縫滲得越快。</p>
          <p className={shared.note}>所以<b>洩水坡度</b>與<b>落水頭暢通</b>是屋頂防水的根本。坡度做足、落水頭不堵,水留不住,自然不漏。</p>
        </Panel>
      </div>
    </div>
  )
}
