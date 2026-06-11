import { useRef, useState } from 'react'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import shared from '../module.module.css'

export const meta = {
  key: 'm04-condense',
  title: '冷凝 vs 漏水',
  category: '環境',
  description: '牆面溫度低於露點就結露,沒有任何漏水牆照樣濕。先判別再決定拆不拆。',
  difficulty: 2,
}

const R = (a, b) => a + Math.random() * (b - a)

export function Component() {
  const m = useRef({ dots: [], leakOn: false, leakProg: 0, quiz: null, T: 28, RH: 75, TW: 20, msg: '', Td: 0, cond: false }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)

  const setT = (v) => { m.T = v; flush() }
  const setRH = (v) => { m.RH = v; flush() }
  const setTW = (v) => { m.TW = v; flush() }
  const toggleLeak = () => { m.leakOn = !m.leakOn; flush() }
  const startQuiz = () => { m.quiz = { ans: Math.random() < 0.5 ? 'cond' : 'leak' }; m.dots = []; m.leakProg = 0; m.msg = '🎯 牆面狀況生成中…觀察<b>分佈型態</b>後作答:冷凝還是漏水?'; flush() }
  const answer = (a) => {
    if (!m.quiz) return
    const ok = a === m.quiz.ans
    m.msg = (ok ? '<span class="ok">✅ 答對!</span>' : '<span class="bad">❌ 答錯。</span>') +
      (m.quiz.ans === 'cond'
        ? '這是<b>冷凝</b>:水珠<b>均勻散佈</b>整面牆、顆粒狀、無特定源頭、跟天氣濕度連動。擦掉很快又出現。'
        : '這是<b>漏水</b>:濕痕<b>從單一源頭往下擴散</b>、有明確邊界、跟樓上/隔戶用水時間連動。') +
      '<br>判別三招:① 看型態(均勻vs放射) ② 摸溫度(冷凝面冰冷) ③ 貼塑膠膜24hr——膜內側濕=冷凝,膜外側濕=滲漏。'
    m.quiz = null; flush()
  }

  const { ref } = useFixedCanvas((ctx, dt) => {
    let T, RH, TW, leak
    if (m.quiz) {
      if (m.quiz.ans === 'cond') { T = 28; RH = 88; TW = 14; leak = false } else { T = 28; RH = 60; TW = 24; leak = true }
    } else { T = m.T; RH = m.RH; TW = m.TW; leak = m.leakOn }
    const Td = T - (100 - RH) / 5
    const cond = TW <= Td
    m.Td = Td; m.cond = cond
    if (cond) { for (let k = 0; k < 4; k++) m.dots.push({ x: R(20, 600), y: R(20, 250), r: R(0.8, 2.2), a: 0 }) }
    m.dots.forEach((d) => d.a = Math.min(0.8, d.a + 0.01))
    if (!cond) m.dots.splice(0, 8)
    if (m.dots.length > 900) m.dots.splice(0, m.dots.length - 900)
    m.leakProg = leak ? Math.min(1, m.leakProg + 0.004) : Math.max(0, m.leakProg - 0.01)

    ctx.fillStyle = '#1a1f25'; ctx.fillRect(0, 0, 620, 340)
    ctx.fillStyle = '#23292f'; ctx.fillRect(0, 300, 620, 40)
    if (m.leakProg > 0) {
      const lp = m.leakProg
      for (let s = 0; s < 5; s++) {
        const yy = 60 + s * lp * 42
        const g = ctx.createRadialGradient(420, yy, 4, 420, yy, 30 + s * 10 * lp)
        g.addColorStop(0, `rgba(35,55,75,${0.55 * lp})`); g.addColorStop(1, 'rgba(35,55,75,0)')
        ctx.fillStyle = g; ctx.fillRect(320, 20, 220, 290)
      }
      ctx.fillStyle = `rgba(120,160,190,${lp * 0.9})`; ctx.beginPath(); ctx.arc(420, 58, 3, 0, 7); ctx.fill()
    }
    m.dots.forEach((d) => { ctx.fillStyle = `rgba(140,190,230,${d.a})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill() })
    if (!m.quiz) {
      ctx.fillStyle = '#dfe7ee'; ctx.font = '13px sans-serif'
      ctx.fillText(`露點溫度 Td ≈ ${Td.toFixed(1)}°C`, 16, 22)
      ctx.fillStyle = cond ? '#ff8a78' : '#7be0c3'
      ctx.fillText(cond ? `牆面 ${TW}°C ≤ 露點 → 結露中(沒有任何漏水,牆照樣濕)` : `牆面 ${TW}°C > 露點 → 不結露`, 16, 40)
      m.msg = '夏天冷氣房隔壁的牆、北向房間冬天的牆,常被誤判成漏水。把<b>濕度拉高、牆溫調低</b>看看露點怎麼決定一切。客訴現場第一件事:先量<b>牆面溫度與室內露點</b>,再決定要不要拆。'
    }

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  const inQuiz = !!m.quiz
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: m.msg }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <div style={{ opacity: inQuiz ? 0.25 : 1, pointerEvents: inQuiz ? 'none' : 'auto' }}>
            <Slider label="室內溫度" value={m.T} min={20} max={32} unit=" °C" onChange={setT} />
            <div style={{ height: 12 }} />
            <Slider label="相對濕度" value={m.RH} min={40} max={95} unit=" %" onChange={setRH} />
            <div style={{ height: 12 }} />
            <Slider label="牆面溫度" value={m.TW} min={8} max={30} unit=" °C" onChange={setTW} />
            <div style={{ height: 12 }} />
            <Button variant="toggle" active={m.leakOn} onClick={toggleLeak}>模擬隔戶漏水:{m.leakOn ? '開' : '關'}</Button>
          </div>
        </Panel>
        <Panel title="出題測驗">
          {!inQuiz
            ? <Button variant="primary" onClick={startQuiz}>🎯 出題測驗</Button>
            : <div className={shared.toggleRow}>
                <Button variant="toggle" onClick={() => answer('cond')}>這是冷凝</Button>
                <Button variant="toggle" onClick={() => answer('leak')}>這是漏水</Button>
              </div>}
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '露點 Td', value: `${m.Td.toFixed(1)}°C`, tone: 'primary' },
            { label: '判定', value: inQuiz ? '測驗中' : (m.cond ? '結露' : '不結露'), tone: m.cond ? 'warn' : 'normal' },
          ]} />
        </Panel>
      </div>
    </div>
  )
}
