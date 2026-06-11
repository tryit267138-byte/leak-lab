import { useState, Suspense } from 'react'
import { useStore } from './store.js'
import { grouped, byKey } from './registry.js'
import styles from './App.module.css'
import shared from './modules/module.module.css'

export default function App() {
  const currentKey = useStore((s) => s.currentKey)
  const setCurrent = useStore((s) => s.setCurrent)
  const [menuOpen, setMenuOpen] = useState(false)
  const groups = grouped()
  const current = currentKey ? byKey[currentKey] : null

  const select = (key) => {
    setCurrent(key)
    setMenuOpen(false)
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.burger} onClick={() => setMenuOpen((o) => !o)} aria-label="選單">☰</button>
        <h1 className={styles.brand}>leak-lab<span className={styles.sub}>虛擬漏水實驗室</span></h1>
        {current && <span className={styles.crumb}>{current.meta.category} · {current.meta.title}</span>}
      </header>

      <div className={styles.body}>
        <nav className={[styles.menu, menuOpen ? styles.menuOpen : ''].join(' ')}>
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

        <main className={styles.stage}>
          {current ? (
            <Suspense fallback={<div className={shared.loading}>載入 3D 模組中…</div>}>
              <current.Component key={current.meta.key} />
            </Suspense>
          ) : (
            <div className={styles.welcome}>
              <h2>虛擬漏水實驗室</h2>
              <p>從左側選一個實驗模組開始。每個模組用互動模擬,把「水為什麼漏、漏在哪、怎麼判」講清楚。</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
