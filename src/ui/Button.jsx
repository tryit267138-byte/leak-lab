import styles from './Button.module.css'

// 共用按鈕。variant: primary | ghost | toggle;active 用於 toggle 狀態。
export function Button({ children, onClick, variant = 'primary', active = false, ...rest }) {
  const cls = [styles.btn, styles[variant], active ? styles.active : ''].join(' ')
  return (
    <button className={cls} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}
