import { useRef } from 'react'
import { useStore } from './store.js'
import { grouped } from './registry.js'
import styles from './Home.module.css'

// 依分類給卡片一個迷你動態預覽的樣式類(純 CSS 動畫,非真模擬)
const PREVIEW = {
  壓力: 'pvPressure', 水路: 'pvFlow', 環境: 'pvEnv',
  檢測: 'pvScan', 材料: 'pvAging', '3D': 'pv3d',
}

export default function Home() {
  const setCurrent = useStore((s) => s.setCurrent)
  const wallRef = useRef(null)
  const groups = grouped()

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.kicker}>HOUSE LEAK LABORATORY</div>
          <h1 className={styles.title}>虛擬漏水實驗室</h1>
          <p className={styles.sub}>14 個互動模組,把「水為什麼漏、漏在哪、怎麼判、怎麼選材」一次講清楚。</p>
          <button className={styles.enter} onClick={() => wallRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            開始探索 ↓
          </button>
        </div>
        <div className={styles.heroGlow} aria-hidden />
      </section>

      <div className={styles.wall} ref={wallRef}>
        {groups.map((g) => (
          <section key={g.category} className={styles.cat}>
            <h2 className={styles.catTitle}><span className={styles.catDot} />{g.category}</h2>
            <div className={styles.cards}>
              {g.items.map((r) => (
                <button key={r.meta.key} className={styles.card} onClick={() => setCurrent(r.meta.key)}>
                  <div className={[styles.preview, styles[PREVIEW[g.category]] || ''].join(' ')} aria-hidden>
                    <i /><i /><i />
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{r.meta.title}</h3>
                    <p className={styles.cardDesc}>{r.meta.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
