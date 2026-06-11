import { useEffect, useRef } from 'react'

// 固定邏輯座標(預設 620×340,沿用原型構圖)的動畫 canvas。
// 不論顯示尺寸,onFrame(ctx) 內一律用 0..W / 0..H 座標繪圖,構圖與原型一致。
// 回傳 { ref, toLogical(clientX, clientY) } 供 canvas 內指標事件換算。
export function useFixedCanvas(onFrame, { width = 620, height = 340 } = {}) {
  const ref = useRef(null)
  const cb = useRef(onFrame)
  cb.current = onFrame

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let last = 0

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    setup()

    const loop = (t) => {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0
      last = t
      cb.current(ctx, dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [width, height])

  const toLogical = (clientX, clientY) => {
    const c = ref.current
    if (!c) return { x: 0, y: 0 }
    const r = c.getBoundingClientRect()
    return {
      x: ((clientX - r.left) / r.width) * width,
      y: ((clientY - r.top) / r.height) * height,
    }
  }

  return { ref, toLogical }
}
