import styles from './Panel.module.css'

// 共用面板容器。title 可選。
export function Panel({ title, children, className = '' }) {
  return (
    <section className={[styles.panel, className].join(' ')}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {children}
    </section>
  )
}
