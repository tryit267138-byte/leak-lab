import { useRef, useState } from 'react'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Button } from '../../ui/Button.jsx'
import { sfx } from '../../engine/audio.js'
import { emitComplete } from '../../engine/labEvents.js'
import shared from '../module.module.css'

export const meta = {
  key: 'm05-inspector',
  title: '檢測員模式',
  category: '檢測',
  description: '業主報案「牆壁濕濕的」。用水分計、熱像儀、灑水試驗找出隱藏病因。',
  difficulty: 3,
}

const CAUSES = ['窗框滲漏', '毛細上升(壁癌)', '負水壓滲漏', '冷凝結露']

export function Component() {
  const m = useRef({
    ans: Math.random() * 4 | 0,
    tool: 'moist', readings: [], sprayed: false, boost: 0, done: false,
    msg: '🕵️ 業主報案:「牆壁濕濕的」。用水分計點牆量測、開熱像儀看分佈、必要時灑水試驗,然後下診斷。',
  }).current
  const [, setTick] = useState(0)
  const flush = () => setTick((t) => t + 1)

  const moist5 = (x, y) => {
    const a = m.ans; let mv = 0.06
    if (a === 0) { const d = Math.hypot(x - 185, y - 185); mv = Math.max(mv, 0.85 * Math.exp(-d * d / 6000) * (y > 170 ? 1 : 0.4)) }
    if (a === 1) { mv = Math.max(mv, y > 240 ? 0.8 : y > 180 ? 0.8 * (1 - (240 - y) / 60) : 0.05) }
    if (a === 2) { const d = Math.hypot(x - 430, y - 150); mv = Math.max(mv, 0.8 * Math.exp(-d * d / 9000)) }
    if (a === 3) { mv = 0.18 + 0.08 * Math.sin(x * 0.05) * Math.sin(y * 0.07) + (y < 150 ? 0.06 : 0) }
    if ((a === 0 || a === 2) && m.sprayed) mv = Math.min(1, mv * (1 + m.boost))
    return mv
  }

  const newCase = () => { m.ans = Math.random() * 4 | 0; m.readings = []; m.sprayed = false; m.boost = 0; m.done = false; m.msg = '🕵️ 業主報案:「牆壁濕濕的」。用水分計點牆量測、開熱像儀看分佈、必要時灑水試驗,然後下診斷。'; flush() }

  const setTool = (t) => { m.tool = t; flush() }
  const spray = () => {
    if (m.done) return
    m.sprayed = true
    if (m.ans === 0 || m.ans === 2) { m.boost = 0.35; m.msg = '🚿 灑水10分鐘後:<b class="bad">讀值明顯上升!</b>濕度跟外部進水直接連動 → 是滲漏,不是冷凝/毛細。' }
    else { m.msg = '🚿 灑水10分鐘後:讀值<b>沒有變化</b>。外牆進水被排除,往毛細或冷凝方向想。' }
    flush()
  }
  const diagnose = (d) => {
    if (m.done) return
    m.done = true
    const ok = d === m.ans
    sfx[ok ? 'correct' : 'wrong']()
    emitComplete('m05-inspector', ok ? 100 : 40)
    const why = [
      '濕痕集中在窗角下方放射狀,灑水後讀值上升 → 窗框界面進水。',
      '濕度集中牆腳、越高越乾、灑水無反應 → 牆腳毛細吸水+鹽分析晶(壁癌)。',
      '濕痕在牆中段單點放射,灑水後上升 → 水從背水面滲出,典型負水壓。',
      '整面均勻低濕度、表面溫度偏低、灑水無反應 → 露點結露,不是漏水。',
    ][m.ans]
    m.msg = (ok ? '<span class="ok">✅ 診斷正確!</span>' : '<span class="bad">❌ 誤診!正解:' + CAUSES[m.ans] + '。</span>') + why + '　按「下一題」繼續。'
    flush()
  }

  const { ref, toLogical } = useFixedCanvas((ctx) => {
    ctx.fillStyle = '#1a1f25'; ctx.fillRect(0, 0, 620, 340)
    ctx.fillStyle = '#23292f'; ctx.fillRect(0, 300, 620, 40)
    ctx.fillStyle = '#2a3a48'; ctx.fillRect(60, 60, 130, 120)
    ctx.fillStyle = '#16222e'; ctx.fillRect(70, 70, 110, 100)
    if (m.tool === 'ir') {
      for (let gy = 0; gy < 300; gy += 15) for (let gx = 0; gx < 620; gx += 15) {
        const mv = moist5(gx + 7, gy + 7)
        const t = (m.ans === 3 ? 17 : 24) - mv * 9
        const k = Math.max(0, Math.min(1, (t - 12) / 14))
        ctx.fillStyle = `rgba(${k * 255 | 0},${k * 120 | 0},${(1 - k) * 255 | 0},0.45)`
        ctx.fillRect(gx, gy, 15, 15)
      }
      ctx.fillStyle = '#dfe7ee'; ctx.font = '12px sans-serif'; ctx.fillText('熱像:藍=低溫(潮濕/結露面) 紅=常溫', 16, 330)
    } else {
      for (let gy = 0; gy < 300; gy += 10) for (let gx = 0; gx < 620; gx += 10) {
        const mv = moist5(gx + 5, gy + 5)
        if (mv > 0.25) { ctx.fillStyle = `rgba(30,50,70,${(mv - 0.25) * 0.8})`; ctx.fillRect(gx, gy, 10, 10) }
      }
      if (m.ans === 1) { ctx.fillStyle = 'rgba(230,230,220,0.5)'; for (let k = 0; k < 40; k++) ctx.fillRect((k * 97) % 600 + 10, 260 + (k * 53) % 35, 2, 2) }
    }
    m.readings.forEach((rd) => {
      ctx.strokeStyle = '#66D3C0'; ctx.beginPath(); ctx.arc(rd.x, rd.y, 6, 0, 7); ctx.stroke()
      ctx.fillStyle = '#0e3a31'; ctx.fillRect(rd.x + 8, rd.y - 20, 52, 18)
      ctx.strokeStyle = '#2a5a4a'; ctx.strokeRect(rd.x + 8, rd.y - 20, 52, 18)
      ctx.fillStyle = '#9ff0dd'; ctx.font = '12px sans-serif'; ctx.fillText((rd.v * 100).toFixed(0) + '%', rd.x + 14, rd.y - 7)
    })
    ctx.fillStyle = '#7d8c98'; ctx.font = '12px sans-serif'; ctx.fillText('案發牆面(內含一種隱藏病因)', 16, 22)
  })

  const onPointerDown = (e) => {
    if (m.tool !== 'moist' || m.done) return
    const { x, y } = toLogical(e.clientX, e.clientY)
    if (y > 300) return
    m.readings.push({ x, y, v: moist5(x, y) })
    if (m.readings.length > 8) m.readings.shift()
    flush()
  }

  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}>
          <canvas ref={ref} className={shared.canvas} onPointerDown={onPointerDown} />
        </div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: m.msg }} />
      </div>
      <div className={shared.controls}>
        <Panel title="儀器">
          <div className={shared.toggleRow}>
            <Button variant="toggle" active={m.tool === 'moist'} onClick={() => setTool('moist')}>💧 水分計(點牆量測)</Button>
            <Button variant="toggle" active={m.tool === 'ir'} onClick={() => setTool('ir')}>🌡 熱像儀</Button>
          </div>
          <div style={{ height: 10 }} />
          <div className={shared.toggleRow}>
            <Button variant="ghost" onClick={spray}>🚿 外牆灑水試驗</Button>
            <Button variant="ghost" onClick={newCase}>下一題</Button>
          </div>
        </Panel>
        <Panel title="診斷">
          <div className={shared.toggleRow}>
            {CAUSES.map((c, i) => (
              <Button key={i} variant="toggle" onClick={() => diagnose(i)}>{c}</Button>
            ))}
          </div>
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}>抓漏靠<b>證據</b>不靠猜:水分計看濕度分佈、熱像儀看溫度型態、灑水試驗驗證外部進水。三者交叉比對才下診斷。</p>
        </Panel>
      </div>
    </div>
  )
}
