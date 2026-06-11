import { useRef, useState } from 'react'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import shared from '../module.module.css'

export const meta = {
  key: 'm03-window',
  title: '窗框風雨試驗',
  category: '檢測',
  description: '風壓 P=v²/16,風速加倍壓力變四倍。老化填縫只有颱風天才漏。',
  difficulty: 2,
}

const R = (a, b) => a + Math.random() * (b - a)
const GRADES = [[10, '普通'], [15, '10級風'], [25, '強風'], [35, '颱風'], [50, '強颱']]

export function Component() {
  const m = useRef({ rain: [], seal: 'good', leak: 0, stain: 0, v: 10, msg: '' }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)
  const setSeal = (s) => { m.seal = s; flush() }
  const setV = (v) => { m.v = v; flush() }
  const reset = () => { m.leak = 0; m.stain = 0; flush() }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const v = m.v, P = v * v / 16
    const cap = m.seal === 'good' ? 50 : 15
    for (let k = 0; k < 6; k++) m.rain.push({ x: R(-150, 620), y: -5, vx: v * 0.22 + R(-0.3, 0.3), vy: R(3, 4.5), slide: false })
    const FX = 200, FX2 = 420, FY = 90, FY2 = 250
    m.rain.forEach((d) => {
      if (!d.slide) {
        d.x += d.vx; d.y += d.vy
        if (d.x > FX && d.x < FX2 && d.y > FY && d.y < FY2) { d.slide = true; d.vx = 0 }
      } else {
        d.y += 1.6 + v * 0.05
        if (d.y >= FY2 - 3) {
          if (P > cap && Math.random() < 0.05) { m.leak++; m.stain = Math.min(1, m.stain + 0.004); d.y = 999 }
          else { d.x += (d.x < 310 ? -2.2 : 2.2); if (d.x < FX - 12 || d.x > FX2 + 12) { d.slide = false; d.vy = 2 } }
          d.y = Math.min(d.y, FY2 - 3)
        }
      }
    })
    m.rain = m.rain.filter((d) => d.y < 350 && d.x < 640)
    if (m.rain.length > 700) m.rain.splice(0, m.rain.length - 700)

    ctx.fillStyle = '#11161b'; ctx.fillRect(0, 0, 620, 340)
    for (let y = 0; y < 340; y += 40) for (let xq = ((y / 40) % 2) * 40; xq < 620; xq += 80) { ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.strokeRect(xq, y, 80, 40) }
    ctx.fillStyle = '#2a3a48'; ctx.fillRect(FX - 14, FY - 14, FX2 - FX + 28, FY2 - FY + 28)
    const sky = ctx.createLinearGradient(0, FY, 0, FY2); sky.addColorStop(0, '#16222e'); sky.addColorStop(1, '#0e1820')
    ctx.fillStyle = sky; ctx.fillRect(FX, FY, FX2 - FX, FY2 - FY)
    ctx.strokeStyle = 'rgba(150,200,230,0.25)'; ctx.strokeRect(FX, FY, FX2 - FX, FY2 - FY)
    ctx.fillStyle = '#3a4a58'; ctx.fillRect(308, FY, 6, FY2 - FY)
    ctx.fillStyle = m.seal === 'good' ? '#46c79a' : '#a05050'; ctx.fillRect(FX - 14, FY2 + 10, FX2 - FX + 28, 4)
    if (m.seal === 'old') { ctx.fillStyle = '#0a0d10'; for (let xq = FX - 10; xq < FX2 + 10; xq += 14) ctx.fillRect(xq, FY2 + 10, 5, 4) }
    if (m.stain > 0) {
      const sg = ctx.createRadialGradient(310, FY2 + 22, 5, 310, FY2 + 22, 120)
      sg.addColorStop(0, `rgba(40,80,120,${m.stain * 0.8})`); sg.addColorStop(1, 'rgba(40,80,120,0)')
      ctx.fillStyle = sg; ctx.fillRect(FX - 14, FY2 + 14, FX2 - FX + 28, 90)
    }
    ctx.strokeStyle = 'rgba(120,180,230,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath()
    m.rain.forEach((d) => { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.vx * 1.5, d.y - (d.slide ? 2 : d.vy * 1.2)) })
    ctx.stroke()
    ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'
    ctx.fillText(`風壓 P = v²/16 = ${P.toFixed(1)} kgf/m²`, 16, 22)
    ctx.fillText(`窗框耐水密:${cap} kgf/m²`, 16, 40)
    const over = P > cap
    ctx.fillStyle = over ? '#ff8a78' : '#7be0c3'
    ctx.fillText(over ? '⚠ 超過水密等級,正在滲水' : '✓ 防線守住', 16, 58)
    const gtxt = GRADES.map((g) => (P >= g[0] ? '●' : '○') + g[0]).join(' ')
    ctx.fillStyle = '#7d8c98'; ctx.fillText('CNS等級 ' + gtxt, 16, 330)

    m.msg = `室內滲水計數:<b>${m.leak}</b>。風壓與風速是<b>平方關係</b>——風速加倍,壓力變四倍。` +
      (m.seal === 'old'
        ? '<span class="bad">老化填縫在15 kgf/m²(約10級風)就潰堤,平常晴天完全看不出問題——這是「只有颱風天漏」的標準答案。</span>'
        : '完好填縫可承受強颱級風壓50 kgf/m²。')

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  const P = m.v * m.v / 16
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: m.msg }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="風速" value={m.v} min={0} max={32} unit=" m/s" onChange={setV} />
          <div style={{ height: 14 }} />
          <div className={shared.note} style={{ marginBottom: 6 }}>窗框填縫</div>
          <div className={shared.toggleRow}>
            <Button variant="toggle" active={m.seal === 'good'} onClick={() => setSeal('good')}>完好(耐50)</Button>
            <Button variant="toggle" active={m.seal === 'old'} onClick={() => setSeal('old')}>老化龜裂(耐15)</Button>
          </div>
          <div style={{ height: 12 }} />
          <Button variant="ghost" onClick={reset}>重置滲水</Button>
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '風速', value: `${m.v} m/s`, tone: 'primary' },
            { label: '風壓 P', value: P.toFixed(1), tone: 'hint' },
            { label: '耐水密', value: m.seal === 'good' ? 50 : 15, tone: 'normal' },
            { label: '滲水計數', value: m.leak, tone: m.leak > 0 ? 'warn' : 'normal' },
          ]} />
        </Panel>
      </div>
    </div>
  )
}
