import { useRef, useState } from 'react'
import { ParticleField } from '../../engine/particles2d.js'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import { sfx, stopSpray } from '../../engine/audio.js'
import { emitComplete } from '../../engine/labEvents.js'
import shared from '../module.module.css'

export const meta = {
  key: 'm06-waterjet',
  title: '高壓水槍檢測',
  category: '檢測',
  description: '按住噴水、拖曳移動噴頭找弱點。壓力過高連好縫也滲——過壓誤判。',
  difficulty: 3,
}

// 沿用 m03 窗框立面構圖
const FX = 200, FX2 = 420, FY = 90, FY2 = 250
const R = (a, b) => a + Math.random() * (b - a)
const THRESH = 100

// 在窗框周邊隨機取一點(弱點藏在填縫線上)
function perimeterPoint() {
  const side = Math.random() * 4 | 0
  if (side === 0) return { x: R(FX, FX2), y: FY }
  if (side === 1) return { x: R(FX, FX2), y: FY2 }
  if (side === 2) return { x: FX, y: R(FY, FY2) }
  return { x: FX2, y: R(FY, FY2) }
}
function nearFrame(p) {
  const onX = p.x > FX - 16 && p.x < FX2 + 16
  const onY = p.y > FY - 16 && p.y < FY2 + 16
  const edge = Math.abs(p.x - FX) < 16 || Math.abs(p.x - FX2) < 16 || Math.abs(p.y - FY) < 16 || Math.abs(p.y - FY2) < 16
  return onX && onY && edge
}

export function Component() {
  const field = useRef(new ParticleField(700)).current
  const m = useRef({
    pressure: 90, dist: 30,
    nozzle: { x: 310, y: 170 }, spraying: false,
    weaks: [perimeterPoint(), perimeterPoint()].map((p) => ({ ...p, dose: 0, found: false })),
    falseSeeps: [], goodDose: 0, msg: '',
  }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)

  const newCase = () => {
    m.weaks = [perimeterPoint(), perimeterPoint()].map((p) => ({ ...p, dose: 0, found: false }))
    m.falseSeeps = []; m.goodDose = 0; field.clear(); flush()
  }
  const setP = (v) => { m.pressure = v; flush() }
  const setDist = (v) => { m.dist = v; flush() }

  const { ref, toLogical } = useFixedCanvas((ctx, dt) => {
    const p = m.pressure, dist = m.dist
    const over = p > THRESH
    const splashR = 22 + dist * 0.6
    if (m.spraying) {
      const rate = (p / (1 + dist * 0.12)) * dt * 6
      // 噴流粒子:從手部 O 噴向噴頭,於噴頭處擴散
      const O = { x: 310, y: 338 }
      const ang = Math.atan2(m.nozzle.y - O.y, m.nozzle.x - O.x)
      const n = Math.max(2, Math.round(p / 14))
      for (let k = 0; k < n; k++) {
        field.emit({ x: O.x, y: O.y, speed: p * 2.2, dir: ang + R(-0.04, 0.04) - (dist / 600), life: 0.32 + R(0, 0.1), r: 1.8 })
        field.emit({ x: m.nozzle.x + R(-4, 4), y: m.nozzle.y + R(-4, 4), speed: p * 0.9, dir: R(-Math.PI, Math.PI), spread: dist * 0.01, life: 0.3, r: 1.5 })
      }
      // 弱點累積
      m.weaks.forEach((w) => {
        if (!w.found && Math.hypot(w.x - m.nozzle.x, w.y - m.nozzle.y) < splashR) {
          w.dose += rate
          if (w.dose > THRESH) {
            w.found = true
            sfx.correct()
            emitComplete('m06-waterjet', m.weaks.filter((x) => x.found).length / 2 * 100)
          }
        }
      })
      // 過壓誤判:>100 時連好縫也滲
      if (over && nearFrame(m.nozzle)) {
        const onWeak = m.weaks.some((w) => Math.hypot(w.x - m.nozzle.x, w.y - m.nozzle.y) < splashR)
        if (!onWeak) {
          m.goodDose += rate
          if (m.goodDose > THRESH) { m.falseSeeps.push({ x: m.nozzle.x, y: m.nozzle.y }); m.goodDose = 0; sfx.warn() }
        }
      }
    }
    field.gravity = 240
    field.update(dt)

    // ── 立面構圖(沿用 m03)──
    ctx.fillStyle = '#11161b'; ctx.fillRect(0, 0, 620, 340)
    for (let y = 0; y < 340; y += 40) for (let xq = ((y / 40) % 2) * 40; xq < 620; xq += 80) { ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.strokeRect(xq, y, 80, 40) }
    ctx.fillStyle = '#2a3a48'; ctx.fillRect(FX - 14, FY - 14, FX2 - FX + 28, FY2 - FY + 28)
    const sky = ctx.createLinearGradient(0, FY, 0, FY2); sky.addColorStop(0, '#16222e'); sky.addColorStop(1, '#0e1820')
    ctx.fillStyle = sky; ctx.fillRect(FX, FY, FX2 - FX, FY2 - FY)
    ctx.strokeStyle = 'rgba(150,200,230,0.25)'; ctx.strokeRect(FX, FY, FX2 - FX, FY2 - FY)
    ctx.fillStyle = '#3a4a58'; ctx.fillRect(308, FY, 6, FY2 - FY)
    ctx.fillStyle = '#46c79a'; ctx.fillRect(FX - 14, FY - 14, FX2 - FX + 28, 4); ctx.fillRect(FX - 14, FY2 + 10, FX2 - FX + 28, 4)
    ctx.fillRect(FX - 14, FY - 14, 4, FY2 - FY + 28); ctx.fillRect(FX2 + 10, FY - 14, 4, FY2 - FY + 28)

    field.drawTrails(ctx, '#7cc4ee')

    // 噴流導線 + 噴頭
    if (m.spraying) {
      ctx.strokeStyle = 'rgba(124,196,238,0.5)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(310, 338); ctx.lineTo(m.nozzle.x, m.nozzle.y); ctx.stroke()
    }
    ctx.fillStyle = '#ffd27b'; ctx.beginPath(); ctx.arc(m.nozzle.x, m.nozzle.y, 5, 0, 7); ctx.fill()

    // 找到的弱點滲水
    m.weaks.forEach((w) => {
      if (w.found) {
        ctx.fillStyle = '#ff8a78'; ctx.beginPath(); ctx.arc(w.x, w.y, 7, 0, 7); ctx.fill()
        ctx.font = '12px sans-serif'; ctx.fillText('定位成功', w.x + 10, w.y + 4)
      }
    })
    m.falseSeeps.forEach((s) => {
      ctx.fillStyle = '#ffd27b'; ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, 7); ctx.fill()
      ctx.font = '12px sans-serif'; ctx.fillText('誤判', s.x + 9, s.y + 4)
    })

    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'
    ctx.fillText(`水壓 ${p} kgf/cm²  噴距 ${dist}cm`, 16, 22)
    if (over) { ctx.fillStyle = '#ff8a78'; ctx.fillText('⚠ 過壓誤判風險(>100)', 16, 40) }

    const found = m.weaks.filter((w) => w.found).length
    m.msg = `檢測SOP:<b>由下而上、低壓開始、分區噴測</b>。已定位弱點 <b>${found}/2</b>。` +
      (over ? '<span class="bad">水壓>100:連完好填縫也被打穿,出現「誤判」滲水——這是過壓的典型陷阱。</span>' : '按住畫面噴水、拖曳移動噴頭,慢慢掃過窗框周邊找弱點。')

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  const aim = (e) => { const pt = toLogical(e.clientX, e.clientY); m.nozzle = pt }
  const down = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); m.spraying = true; aim(e); sfx.spray() }
  const move = (e) => { if (m.spraying) aim(e) }
  const up = () => { m.spraying = false; stopSpray() }

  const found = m.weaks.filter((w) => w.found).length
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}>
          <canvas ref={ref} className={shared.canvas}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} />
        </div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: m.msg }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="水壓" value={m.pressure} min={30} max={150} unit=" kgf/cm²" onChange={setP} />
          <div style={{ height: 12 }} />
          <Slider label="噴距" value={m.dist} min={10} max={60} unit=" cm" onChange={setDist} />
          <div style={{ height: 12 }} />
          <Button variant="ghost" onClick={newCase}>下一題(重設弱點)</Button>
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '水壓', value: m.pressure, tone: m.pressure > THRESH ? 'warn' : 'primary' },
            { label: '噴距', value: `${m.dist}cm`, tone: 'normal' },
            { label: '定位', value: `${found}/2`, tone: found > 0 ? 'primary' : 'normal' },
            { label: '誤判', value: m.falseSeeps.length, tone: m.falseSeeps.length ? 'warn' : 'normal' },
          ]} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}>高壓灑水試驗是抓漏定位利器,但 SOP 是<b>由下而上、低壓開始、分區噴測</b>——慢慢逼近,看哪裡先滲。</p>
          <p className={shared.note}>壓力一旦過高(&gt;100),水會被打進<b>平常根本不會漏</b>的縫,連完好填縫都滲出,造成<b>過壓誤判</b>。寧可低壓多噴幾次。</p>
        </Panel>
      </div>
    </div>
  )
}
