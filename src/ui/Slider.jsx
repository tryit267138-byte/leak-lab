import styles from './Slider.module.css'

// 共用滑桿。觸控友善(手機 375px 可操作)。
export function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <label className={styles.wrap}>
      <span className={styles.row}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}{unit}</span>
      </span>
      <input
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${((value - min) / (max - min)) * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
