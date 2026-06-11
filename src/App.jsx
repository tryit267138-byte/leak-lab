import { useState, useEffect, Suspense } from 'react'
import { useStore } from './store.js'
import { grouped, byKey } from './registry.js'
import { initAudio, setMuted, isMuted } from './engine/audio.js'
import Home from './Home.jsx'
import styles from './App.module.css'
import shared from './modules/module.module.css'

export default function App() {
  const currentKey = useStore((s) => s.currentKey)
  const setCurrent = useStore((s) => s.setCurrent)
  const clearCurrent = useStore((s) => s.clearCurrent)
  const [menuOpen, setMenuOpen] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const groups = grouped()
  const current = currentKey ? byKey[currentKey] : null

  // 首次使用者互動後才初始化 AudioContext(autoplay 政策)
  useEffect(() => {
    const onFirst = () => { initAudio() }
    window.addEventListener('pointerdown', onFirst, { once: true })
    window.addEventListener('keydown', onFirst, { once: true })
    return () => { window.removeEventListener('pointerdown', onFirst); window.removeEventListener('keydown', onFirst) }
  }, [])

  const select = (key) => { setCurrent(key); setMenuOpen(false) }
  const toggleMute = () => { const v = !muted; setMuted(v); setMutedState(v) }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        {current && <button className={styles.burger} onClick={() => setMenuOpen((o) => !o)} aria-label="選單">☰</button>}
        <h1 className={styles.brand} onClick={clearCurrent} title="回首頁">leak-lab<span className={styles.sub}>虛擬漏水實驗室</span></h1>
        {current && <span className={styles.crumb}>{current.meta.category} · {current.meta.title}</span>}
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
                    <span className={styles.itemTitle}>{r.meta.title}</span>
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
    </div>
  )
}
