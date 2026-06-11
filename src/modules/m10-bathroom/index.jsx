import { useRef, useState } from 'react'
import { ParticleField } from '../../engine/particles2d.js'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { useStore } from '../../store.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import { emitComplete } from '../../engine/labEvents.js'
import shared from '../module.module.css'

export const meta = {
  key: 'm10-bathroom',
  title: '浴室隔戶滲漏',
  category: '水路',
  description: '防水層只做30cm,水從上方磚縫滲入,飽和後在隔壁戶背水面長壁癌。',
  difficulty: 3,
}

const R = (a, b) => a + Math.random() * (b - a)
const FLOORY = 300, CEILY = 20, WALL_CM = 240
const HPX = (FLOORY - CEILY) / WALL_CM // px per cm
const HEADCM = 180 // 蓮蓬頭高度
const WP_OPTS = [30, 90, 180, 240]
// 固定白華斑點座標(右戶背水面)
const SPOTS = Array.from({ length: 40 }, (_, i) => ({ x: 345 + (i * 53) % 220, y: 60 + (i * 89) % 200 }))

export function Component() {
  const shower = useRef(new ParticleField(400)).current
  const setCurrent = useStore((s) => s.setCurrent)
  const m = useRef({ wp: 30, tile: 60, showerMin: 30, sat: 0 }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)
  const setWp = (v) => { m.wp = v; flush() }
  const setTile = (v) => { m.tile = v; flush() }
  const setShower = (v) => { m.showerMin = v; flush() }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const wpTopY = FLOORY - m.wp * HPX
    const wetTopY = FLOORY - HEADCM * HPX
    const exposedCm = Math.max(0, HEADCM - m.wp)
    const exposedFrac = exposedCm / HEADCM
    const entry = exposedFrac * (m.tile / 100) * (m.showerMin / 60) * 0.5
    m.sat = Math.max(0, Math.min(1, m.sat + entry * dt - 0.02 * dt))
    if (m.sat > 0.6) emitComplete('m10-bathroom', 100)

    // 蓮蓬頭水流
    for (let k = 0; k < 4; k++) shower.emit({ x: 150 + R(-4, 4), y: 70, vx: R(-4, 4), vy: R(120, 180), life: 2, r: 1.8 })
    shower.gravity = 120; shower.update(dt, (p) => { if (p.x > 250) p.x = 250; return p.y < FLOORY })

    // ── 繪圖 ──
    ctx.fillStyle = '#11161b'; ctx.fillRect(0, 0, 620, 340)
    ctx.fillStyle = 'rgba(120,180,220,0.05)'; ctx.fillRect(40, CEILY, 250, FLOORY - CEILY) // 浴室
    ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(330, CEILY, 250, FLOORY - CEILY) // 臥室
    // 共用牆
    ctx.fillStyle = '#3a4350'; ctx.fillRect(290, CEILY, 40, FLOORY - CEILY)
    // 浴室磁磚(左牆面)
    ctx.strokeStyle = `rgba(0,0,0,${0.1 + m.tile / 400})`
    for (let y = CEILY; y < FLOORY; y += 16) { ctx.beginPath(); ctx.moveTo(250, y); ctx.lineTo(290, y); ctx.stroke() }
    // 防水層(浴室側,floor 到 wp 高)
    ctx.fillStyle = '#2a8f6a'; ctx.fillRect(284, wpTopY, 6, FLOORY - wpTopY)
    ctx.fillStyle = '#ffd27b'; ctx.font = '12px sans-serif'; ctx.fillText(`防水層 ${m.wp}cm`, 150, wpTopY + 4)
    // 暴露磚縫(wp 以上、淋浴範圍內)進水箭頭
    if (exposedCm > 0) {
      ctx.strokeStyle = 'rgba(120,190,240,0.7)'; ctx.lineWidth = 2
      for (let y = wetTopY; y < wpTopY; y += 26) {
        ctx.beginPath(); ctx.moveTo(270, y); ctx.lineTo(292, y); ctx.lineTo(286, y - 4); ctx.moveTo(292, y); ctx.lineTo(286, y + 4); ctx.stroke()
      }
      ctx.lineWidth = 1
    }
    shower.draw(ctx, '#7cc4ee')
    // 蓮蓬頭
    ctx.fillStyle = '#8fa0ad'; ctx.fillRect(140, 60, 20, 8)
    // 右戶背水面壁癌
    if (m.sat > 0.05) {
      const g = ctx.createLinearGradient(330, 0, 420, 0)
      g.addColorStop(0, `rgba(60,80,70,${m.sat * 0.8})`); g.addColorStop(1, 'rgba(60,80,70,0)')
      ctx.fillStyle = g; ctx.fillRect(330, wetTopY, 120, wpTopY - wetTopY + 40)
      const n = Math.round(m.sat * SPOTS.length)
      ctx.fillStyle = `rgba(230,230,215,${0.3 + m.sat * 0.5})`
      for (let i = 0; i < n; i++) { const s = SPOTS[i]; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 7); ctx.fill() }
    }
    // 地板與標籤
    ctx.fillStyle = '#23292f'; ctx.fillRect(0, FLOORY, 620, 40)
    ctx.fillStyle = '#7d8c98'; ctx.font = '12px sans-serif'
    ctx.fillText('左戶:浴室(淋浴中)', 60, 332); ctx.fillText('右戶:臥室(背水面)', 360, 332)
    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'; ctx.fillText(`牆體飽和度 ${(m.sat * 100).toFixed(0)}%`, 16, 16)

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: m.sat > 0.6
          ? `<span class="bad">隔壁臥室牆面開始長<b>壁癌</b>了。</span>防水層只做 ${m.wp}cm,蓮蓬頭的水從上方磚縫滲入牆體,累積飽和後在右戶<b>背水面</b>析出。背水面為什麼難處理?觀念連回 m01 負水壓。`
          : `淋浴的水會打到約 180cm 高;防水層只做 ${m.wp}cm,上方磚縫就是進水口。水滲入牆體累積飽和後,會跑到隔壁戶<b>背水面</b>長壁癌——這是負水壓問題(見 m01)。` }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <div className={shared.note} style={{ marginBottom: 6 }}>浴室防水層高度</div>
          <div className={shared.toggleRow}>
            {WP_OPTS.map((h) => (<Button key={h} variant="toggle" active={m.wp === h} onClick={() => setWp(h)}>{h}cm</Button>))}
          </div>
          <div style={{ height: 12 }} />
          <Slider label="磚縫劣化程度" value={m.tile} min={0} max={100} unit=" %" onChange={setTile} />
          <div style={{ height: 12 }} />
          <Slider label="每日淋浴時間" value={m.showerMin} min={5} max={60} unit=" 分" onChange={setShower} />
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '防水層', value: `${m.wp}cm`, tone: m.wp < 180 ? 'warn' : 'primary' },
            { label: '飽和度', value: `${(m.sat * 100).toFixed(0)}%`, tone: m.sat > 0.5 ? 'warn' : 'normal' },
          ]} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}>淋浴水會打到約 180cm 高。防水層只做<b>30cm</b>,上方磚縫全成了進水口——水滲進牆體,在隔壁戶背水面長<b>壁癌</b>。浴室防水至少要做到淋浴範圍以上。</p>
          <Button variant="primary" onClick={() => setCurrent('m01-pressure')}>前往 m01 複習背水面/負水壓 →</Button>
        </Panel>
      </div>
    </div>
  )
}
