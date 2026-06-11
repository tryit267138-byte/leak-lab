import { useRef, useState } from 'react'
import { useFixedCanvas } from '../../ui/useFixedCanvas.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import shared from '../module.module.css'

export const meta = {
  key: 'm01-pressure',
  title: '正負水壓',
  category: '壓力',
  description: '迎水面 vs 背水面:水壓的方向,決定皮膜是朋友還是敵人。',
  difficulty: 1,
}

const R = (a, b) => a + Math.random() * (b - a)

export function Component() {
  // 對應原型 M1 狀態
  const m = useRef({ p: 4, coat: 'none', mat: 'pu', drops: [], leak: 0, blister: 0, popped: false, cryst: 0, msg: '' }).current
  const [, setTick] = useState(0)
  const acc = useRef(0)
  const flush = () => setTick((t) => t + 1)

  const resetMat = () => { m.blister = 0; m.popped = false; m.cryst = 0 }
  const setCoat = (c) => { m.coat = c; resetMat(); flush() }
  const setMat = (mt) => { m.mat = mt; resetMat(); flush() }
  const reset = () => { m.drops = []; m.leak = 0; m.blister = 0; m.popped = false; m.cryst = 0; flush() }
  const setP = (v) => { m.p = v; flush() }

  const { ref } = useFixedCanvas((ctx, dt) => {
    const p = m.p
    const WX = 290, WW = 40, CY = 164
    let leakRate = 0, msg = ''
    if (m.coat === 'none') {
      leakRate = p * 0.05
      msg = '<b>未做防水</b>:水壓直接把水從裂縫推進室內。壓力越大,滲水越快。'
    } else if (m.coat === 'left') {
      leakRate = 0
      msg = '<span class="ok">✅ 迎水面施作(正水壓工法)</span>:水壓把塗膜「壓」在結構上,膜越壓越貼。屋頂PU就是這個原理——<b>水壓是你的朋友</b>。'
    } else {
      if (m.mat === 'pu') {
        if (!m.popped) {
          m.blister = Math.min(30, m.blister + p * 0.012)
          msg = `<b>背水面+皮膜型</b>:水穿過結構,從背面「頂」塗膜。起鼓中…(${(m.blister / 30 * 100) | 0}%)。<b>水壓變成你的敵人</b>。`
          if (m.blister >= 30) { m.popped = true; for (let k = 0; k < 36; k++) m.drops.push({ x: 336, y: CY, vx: R(0.5, 3), vy: R(-2, 1) }) }
        } else {
          leakRate = p * 0.05
          msg = '<span class="bad">💥 皮膜被負水壓頂破!</span>這就是為什麼地下室/浴室背水面用一般PU會失敗——皮膜型材料只能附著,擋不住背後的水壓。'
        }
      } else {
        m.cryst = Math.min(1, m.cryst + 0.003)
        leakRate = p * 0.05 * (1 - m.cryst)
        msg = m.cryst < 1
          ? `<b>背水面+滲透結晶型</b>:活性成分順著水的毛細通路滲入結構,在孔隙內結晶填塞…(${(m.cryst * 100) | 0}%)。它不靠附著,靠<b>長進混凝土裡</b>。`
          : '<span class="ok">✅ 結晶完成,毛細孔被填塞,負水壓側成功止水。</span>負水壓面的正解:滲透結晶型/注入工法,不是皮膜。'
      }
    }
    if (Math.random() < leakRate) m.drops.push({ x: 336, y: CY + R(-2, 2), vx: R(0.5, 1) + p * 0.12, vy: R(-0.3, 0.3) })
    m.drops.forEach((d) => { d.vy += 0.18; d.x += d.vx; d.y += d.vy; if (d.y > 316) { d.y = 316; d.vy = 0; d.vx *= 0.9 } })
    if (m.drops.length > 400) m.drops.splice(0, m.drops.length - 400)
    m.leak += leakRate
    m.msg = msg + `<br>累積滲水:<b>${m.leak.toFixed(0)} 單位</b>`

    // draw
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, 620, 340)
    const lvl = 320 - (60 + p * 22)
    const grd = ctx.createLinearGradient(0, lvl, 0, 320); grd.addColorStop(0, '#3a8fd4'); grd.addColorStop(1, '#1c4a7a')
    ctx.fillStyle = grd; ctx.fillRect(20, lvl, WX - 20, 320 - lvl)
    ctx.fillStyle = '#6fb6e8'; ctx.fillRect(20, lvl, WX - 20, 3)
    ctx.fillStyle = '#7d8c98'; ctx.font = '12px sans-serif'
    ctx.fillText('水(迎水面)', 60, lvl - 8); ctx.fillText('室內(背水面)', 420, 40)
    ctx.fillStyle = '#5e646c'; ctx.fillRect(WX, 20, WW, 300)
    for (let y = 30; y < 320; y += 18) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(WX, y, WW, 1) }
    if (m.cryst > 0) { ctx.fillStyle = `rgba(150,120,200,${m.cryst * 0.5})`; ctx.fillRect(WX, CY - 30, WW, 60) }
    ctx.fillStyle = m.cryst >= 1 ? '#7a6a9a' : '#101418'; ctx.fillRect(WX, CY - 3, WW, 7)
    if (m.coat === 'left') { ctx.fillStyle = m.mat === 'pu' ? '#2a8f6a' : '#9a7ad0'; ctx.fillRect(WX - 6, 20, 6, 300) }
    if (m.coat === 'right' && !m.popped) {
      ctx.fillStyle = m.mat === 'pu' ? '#2a8f6a' : '#9a7ad0'; ctx.fillRect(WX + WW, 20, 6, 300)
      if (m.blister > 0 && m.mat === 'pu') {
        ctx.beginPath(); ctx.arc(WX + WW + 3, CY, m.blister, Math.PI * 1.5, Math.PI * 0.5)
        ctx.fillStyle = '#2a8f6a'; ctx.fill(); ctx.strokeStyle = '#46c79a'; ctx.stroke()
        ctx.fillStyle = '#ffd27b'; ctx.font = '12px sans-serif'; ctx.fillText('起鼓!', WX + WW + m.blister + 6, CY + 4)
      }
    }
    if (m.popped) { ctx.fillStyle = '#ff8a78'; ctx.font = '13px sans-serif'; ctx.fillText('💥 塗膜破裂', WX + WW + 10, CY - 14) }
    ctx.strokeStyle = 'rgba(120,190,240,0.7)'; ctx.lineWidth = 2
    for (let k = 0; k < p; k++) {
      const ay = lvl + 15 + k * ((315 - lvl) / Math.max(p, 1))
      ctx.beginPath(); ctx.moveTo(WX - 30, ay); ctx.lineTo(WX - 8, ay); ctx.lineTo(WX - 14, ay - 4); ctx.moveTo(WX - 8, ay); ctx.lineTo(WX - 14, ay + 4); ctx.stroke()
    }
    ctx.fillStyle = '#5db2e8'; m.drops.forEach((d) => ctx.fillRect(d.x, d.y, 3, 3))
    ctx.fillStyle = '#222a32'; ctx.fillRect(WX + WW, 320, 620 - WX - WW, 20); ctx.fillRect(0, 320, WX, 20)

    acc.current += dt; if (acc.current > 0.12) { acc.current = 0; flush() }
  })

  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.stage}><canvas ref={ref} className={shared.canvas} /></div>
        <div className={shared.dynNote} dangerouslySetInnerHTML={{ __html: m.msg }} />
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <Slider label="水壓" value={m.p} min={1} max={10} unit="" onChange={setP} />
          <div style={{ height: 14 }} />
          <div className={shared.note} style={{ marginBottom: 6 }}>塗膜位置</div>
          <div className={shared.toggleRow}>
            <Button variant="toggle" active={m.coat === 'none'} onClick={() => setCoat('none')}>無</Button>
            <Button variant="toggle" active={m.coat === 'left'} onClick={() => setCoat('left')}>迎水面(正水壓工法)</Button>
            <Button variant="toggle" active={m.coat === 'right'} onClick={() => setCoat('right')}>背水面(負水壓工法)</Button>
          </div>
          <div style={{ height: 12 }} />
          <div className={shared.note} style={{ marginBottom: 6 }}>材料</div>
          <div className={shared.toggleRow}>
            <Button variant="toggle" active={m.mat === 'pu'} onClick={() => setMat('pu')}>PU皮膜型</Button>
            <Button variant="toggle" active={m.mat === 'cr'} onClick={() => setMat('cr')}>滲透結晶型</Button>
          </div>
          <div style={{ height: 12 }} />
          <Button variant="ghost" onClick={reset}>重置</Button>
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '水壓', value: m.p, tone: 'primary' },
            { label: '累積滲水', value: `${m.leak.toFixed(0)}`, tone: m.leak > 0 ? 'warn' : 'normal' },
          ]} />
        </Panel>
        <Panel title="教學重點">
          <p className={shared.note}>水壓<b>有方向</b>:迎水面施作,水壓把皮膜壓得更貼(朋友);背水面施作,水壓把皮膜往外頂(敵人)。</p>
          <p className={shared.note}>背水面正解不是皮膜型,而是<b>滲透結晶型</b>——靠活性成分長進混凝土孔隙結晶填塞,不靠附著。</p>
        </Panel>
      </div>
    </div>
  )
}
