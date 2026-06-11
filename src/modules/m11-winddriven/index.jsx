import { useRef, useState } from 'react'
import { ParticleField } from '../../engine/particles2d.js'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Hud } from '../../ui/Hud.jsx'
import shared from '../module.module.css'

export const meta = {
  key: 'm11-winddriven',
  title: '風揚水',
  category: '水路',
  description: '強風使雨水沿外牆向上爬,>12m/s 越過滴水線灌入女兒牆內側。',
  difficulty: 2,
}

const R = (a, b) => a + Math.random() * (b - a)
const ROOFY = 300, DRIPY = 84, THRESH = 12

export function Component() {
  const climb = useRef(new ParticleField(500)).current
  const over = useRef(new ParticleField(300)).current
  const m = useRef({ wind: 8, innerWet: 0 }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)
  const setWind = (v) => { m.wind = v; flush() }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const w = m.wind
    const overtop = w > THRESH
    m.innerWet = Math.max(0, Math.min(1, m.innerWet + (overtop ? (w - THRESH) * 0.06 : -0.12) * dt))

    // 沿外牆爬升的雨(向上初速∝風速,重力拉回 → 峰高∝風速)
    for (let k = 0; k < Math.round(w / 2); k++) climb.emit({ x: R(350, 366), y: ROOFY, vx: R(-8, -2), vy: -w * 11 - R(0, 20), life: 3, r: 1.7 })
    climb.gravity = 300
    climb.update(dt, (p) => {
      // 越過滴水線:風夠強且爬過 DRIPY → 倒灌到內側
      if (overtop && p.y < DRIPY && p.x > 300) { over.emit({ x: 300 - R(0, 6), y: DRIPY + R(0, 6), vx: -R(6, 16), vy: R(10, 30), life: 1.6, r: 1.8 }); return false }
      return p.y < ROOFY + 4
    })
    over.gravity = 160; over.update(dt, (p) => p.y < ROOFY)

    // ── 繪圖 ──
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, 620, 340)
    // 屋頂(左)
    ctx.fillStyle = '#1a2129'; ctx.fillRect(0, ROOFY, 300, 40)
    ctx.fillStyle = '#16202a'; ctx.fillRect(0, ROOFY - 4, 300, 4)
    // 女兒牆牆身
    ctx.fillStyle = '#5e646c'; ctx.fillRect(308, 84, 32, ROOFY - 84)
    // 內側未防水區(染色)
    if (m.innerWet > 0.02) { ctx.fillStyle = `rgba(60,90,120,${m.innerWet * 0.8})`; ctx.fillRect(300, 90, 10, ROOFY - 90) }
    ctx.fillStyle = '#3a4350'; ctx.fillRect(300, 90, 8, ROOFY - 90) // 內面
    // 壓頂(cap)+ 滴水線
    ctx.fillStyle = '#6e747c'; ctx.fillRect(300, 68, 50, 16)
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(345, 80, 5, 5) // 滴水線凹槽
    // 外側地面下方
    ctx.fillStyle = '#11161b'; ctx.fillRect(350, 84, 270, 256)
    // 粒子
    climb.draw(ctx, '#7cc4ee'); over.draw(ctx, overtop ? '#ff8a78' : '#5db2e8')
    // 風向箭頭
    ctx.strokeStyle = 'rgba(180,200,210,0.5)'; ctx.lineWidth = 2
    for (let y = 120; y < 280; y += 50) { ctx.beginPath(); ctx.moveTo(440, y); ctx.lineTo(380, y); ctx.lineTo(388, y - 5); ctx.moveTo(380, y); ctx.lineTo(388, y + 5); ctx.stroke() }
    ctx.lineWidth = 1
    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'
    ctx.fillText(`風速 ${w} m/s`, 16, 22)
    ctx.fillStyle = overtop ? '#ff8a78' : '#7be0c3'
    ctx.fillText(overtop ? '⚠ 水越過滴水線,灌入女兒牆內側' : '✓ 滴水線守住,水在此滴落', 16, 40)
    ctx.fillStyle = '#7d8c98'; ctx.font = '12px sans-serif'
    ctx.fillText('屋頂', 40, ROOFY - 12); ctx.fillText('滴水線(水切)', 356, 96)

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  const overtop = m.wind > THRESH
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: `<b>滴水線(水切)</b>靠重力讓水在牆緣斷開、滴落。但風夠強(>${THRESH} m/s)時,雨水會沿外牆<b>向上爬</b>,直接越過滴水線、灌進女兒牆內側未防水區——這就是為什麼頂樓側牆會「<b>由上往下濕</b>」。` }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="風速" value={m.wind} min={0} max={25} unit=" m/s" onChange={setWind} />
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '風速', value: `${m.wind} m/s`, tone: overtop ? 'warn' : 'primary' },
            { label: '越過滴水線', value: overtop ? '是' : '否', tone: overtop ? 'warn' : 'normal' },
            { label: '內側濕度', value: `${(m.innerWet * 100).toFixed(0)}%`, tone: m.innerWet > 0.3 ? 'warn' : 'normal' },
          ]} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}><b>滴水線</b>不是裝飾線腳,是讓水在牆緣斷開滴落、不繞到背面的關鍵。但它<b>怕風</b>:強風揚水可讓水逆重力爬升越線。</p>
          <p className={shared.note}>頂樓女兒牆內側若沒做防水,被風揚水灌入後,整面牆會從上往下濕——抓漏時別忘了往<b>上</b>找進水點。</p>
        </Panel>
      </div>
    </div>
  )
}
