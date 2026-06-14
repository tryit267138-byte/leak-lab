import { useState, useEffect, useRef, Suspense } from 'react'
import { useStore } from './store.js'
import { grouped, byKey, registry } from './registry.js'
import { initAudio, setMuted, isMuted } from './engine/audio.js'
import { TAKEAWAYS } from './engine/takeaways.js'
import Home from './Home.jsx'
import styles from './App.module.css'
import shared from './modules/module.module.css'

export default function App() {
  const currentKey = useStore((s) => s.currentKey)
  const setCurrent = useStore((s) => s.setCurrent)
  const clearCurrent = useStore((s) => s.clearCurrent)
  const completed = useStore((s) => s.completed)
  const markComplete = useStore((s) => s.markComplete)
  const [menuOpen, setMenuOpen] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(0)
  const groups = grouped()
  const current = currentKey ? byKey[currentKey] : null
  const doneCount = Object.keys(completed).length

  // 首次使用者互動後才初始化 AudioContext(autoplay 政策)
  useEffect(() => {
    const onFirst = () => { initAudio() }
    window.addEventListener('pointerdown', onFirst, { once: true })
    window.addEventListener('keydown', onFirst, { once: true })
    return () => { window.removeEventListener('pointerdown', onFirst); window.removeEventListener('keydown', onFirst) }
  }, [])

  // 模組完成事件 → 記錄進度 + 彈出核心觀念小卡(僅首次完成才彈)
  useEffect(() => {
    const onComplete = (e) => {
      const { key, score } = e.detail || {}
      const firstTime = !(key in useStore.getState().completed)
      markComplete(key, score)
      if (firstTime && byKey[key]) {
        setToast({ title: byKey[key].meta.title, text: TAKEAWAYS[key] || '' })
        clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 5200)
      }
    }
    window.addEventListener('lab:complete', onComplete)
    return () => { window.removeEventListener('lab:complete', onComplete); clearTimeout(toastTimer.current) }
  }, [markComplete])

  const select = (key) => { setCurrent(key); setMenuOpen(false) }
  const toggleMute = () => { const v = !muted; setMuted(v); setMutedState(v) }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        {current && <button className={styles.burger} onClick={() => setMenuOpen((o) => !o)} aria-label="選單">☰</button>}
        <h1 className={styles.brand} onClick={clearCurrent} title="回首頁">leak-lab<span className={styles.sub}>虛擬漏水實驗室</span></h1>
        {current && <span className={styles.crumb}>{current.meta.category} · {current.meta.title}</span>}
        <span className={styles.progress} title="本次完成度">已完成 {doneCount}/{registry.length}</span>
        <button className={styles.mute} onClick={toggleMute} aria-label={muted ? '開啟聲音' : '靜音'} title={muted ? '開啟聲音' : '靜音'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <div className={styles.body}>
        {current && (
          <nav className={[styles.menu, menuOpen ? styles.menuOpen : ''].join(' ')}>
            <button className={styles.home} onClick={clearCurrent}>← 回首頁</button>
            {groups.map((g) => (
              <div key={g.category} className={styles.group}>
                <div className={styles.groupTitle}>{g.category}</div>
                {g.items.map((r) => (
                  <button
                    key={r.meta.key}
                    className={[styles.item, currentKey === r.meta.key ? styles.itemActive : ''].join(' ')}
                    onClick={() => select(r.meta.key)}
                  >
                    <span className={styles.itemTitle}>{r.meta.title}{r.meta.key in completed && <span className={styles.done}>✓</span>}</span>
                    <span className={styles.itemDesc}>{r.meta.description}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        )}

        <main className={[styles.stage, current ? '' : styles.stageFull].join(' ')}>
          {current ? (
            <div key={current.meta.key} className={styles.fade}>
              <Suspense fallback={<div className={shared.loading}>載入 3D 模組中…</div>}>
                <current.Component />
              </Suspense>
            </div>
          ) : (
            <div className={styles.fade}><Home /></div>
          )}
        </main>
      </div>

      {toast && (
        <div className={styles.toast} role="status" onClick={() => setToast(null)}>
          <div className={styles.toastHead}><span className={styles.toastCheck}>✓</span>完成:{toast.title}</div>
          <div className={styles.toastBody}>{toast.text}</div>
        </div>
      )}
    </div>
  )
}
