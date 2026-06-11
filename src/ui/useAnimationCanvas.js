import { useEffect, useRef } from 'react'

// 共用動畫 canvas hook。提供已設定好的 2D context 與每幀 dt(秒)。
// onFrame(ctx, dt, { w, h }) 每幀呼叫。自動處理 devicePixelRatio 與 resize。
export function useAnimationCanvas(onFrame) {
  const ref = useRef(null)
  const cb = useRef(onFrame)
  cb.current = onFrame

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let last = 0
    let w = 0, h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      w = rect.width; h = rect.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const loop = (t) => {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0
      last = t
      ctx.clearRect(0, 0, w, h)
      cb.current(ctx, dt, { w, h })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return ref
}
