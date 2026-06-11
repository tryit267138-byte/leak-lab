import styles from './Hud.module.css'

// 共用 HUD:即時數值顯示。items: [{ label, value, tone }]
// tone: 'normal' | 'warn' | 'hint' | 'primary'
export function Hud({ items }) {
  return (
    <div className={styles.hud}>
      {items.map((it, i) => (
        <div key={i} className={styles.item}>
          <span className={styles.label}>{it.label}</span>
          <span key={String(it.value)} className={[styles.value, styles[it.tone || 'normal']].join(' ')}>
            {it.value}
          </span>
        </div>
      ))}
    </div>
  )
}
