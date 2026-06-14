// 共用 2D 粒子引擎。各模組複用此引擎做水/水滴/水束模擬。
// 純 canvas,無外部依賴。座標系:像素,y 向下為正。

// 柔邊光斑 sprite 快取(依顏色),drawLiquid 用 drawImage 取代逐幀 radial gradient(效能)
const _spriteCache = {}
function liquidSprite(color) {
  if (_spriteCache[color]) return _spriteCache[color]
  const s = 64
  const cv = document.createElement('canvas'); cv.width = cv.height = s
  const c = cv.getContext('2d')
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, color); g.addColorStop(0.35, color); g.addColorStop(1, 'transparent')
  c.fillStyle = g; c.fillRect(0, 0, s, s)
  _spriteCache[color] = cv
  return cv
}

export class Particle {
  constructor() {
    this.reset()
  }
  reset() {
    this.x = 0; this.y = 0
    this.vx = 0; this.vy = 0
    this.life = 0; this.maxLife = 1
    this.r = 2
    this.alive = false
    return this
  }
}

export class ParticleField {
  constructor(max = 600) {
    this.max = max
    this.pool = Array.from({ length: max }, () => new Particle())
    this.gravity = 60        // px/s²(2D 視覺用,非真實重力)
    this.bounds = null       // { x, y, w, h } 可選的邊界(超出即消滅)
  }

  count() {
    let n = 0
    for (const p of this.pool) if (p.alive) n++
    return n
  }

  emit({ x, y, vx = 0, vy = 0, life = 2, r = 2, spread = 0, speed = 0, dir = Math.PI / 2 }) {
    const p = this.pool.find((q) => !q.alive)
    if (!p) return null
    p.reset()
    p.alive = true
    p.x = x; p.y = y
    if (speed) {
      const a = dir + (spread ? (Math.sin(x * 0.13 + y) * 0.5) * spread : 0)
      p.vx = Math.cos(a) * speed + vx
      p.vy = Math.sin(a) * speed + vy
    } else {
      p.vx = vx; p.vy = vy
    }
    p.life = life; p.maxLife = life
    p.r = r
    return p
  }

  // dt 秒。onParticle(p, dt) 可回傳 false 以提前消滅該粒子(自訂碰撞)。
  update(dt, onParticle) {
    const g = this.gravity * dt
    for (const p of this.pool) {
      if (!p.alive) continue
      p.vy += g
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
      let kill = p.life <= 0
      if (!kill && this.bounds) {
        const b = this.bounds
        if (p.x < b.x || p.x > b.x + b.w || p.y > b.y + b.h) kill = true
      }
      if (!kill && onParticle) {
        if (onParticle(p, dt) === false) kill = true
      }
      if (kill) p.alive = false
    }
  }

  draw(ctx, color = '#4aa3ff') {
    ctx.save()
    ctx.fillStyle = color
    for (const p of this.pool) {
      if (!p.alive) continue
      const a = Math.max(0, Math.min(1, p.life / p.maxLife))
      ctx.globalAlpha = 0.3 + a * 0.6
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // 高級水體:柔邊光斑(sprite 快取)以 'lighter' 疊加 → 重疊處成團發光,像液體
  drawLiquid(ctx, color = '#4aa3ff', scale = 4) {
    const sp = liquidSprite(color)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.pool) {
      if (!p.alive) continue
      const a = Math.max(0, Math.min(1, p.life / p.maxLife))
      const r = p.r * scale
      ctx.globalAlpha = 0.1 + a * 0.22
      ctx.drawImage(sp, p.x - r, p.y - r, r * 2, r * 2)
    }
    ctx.restore()
  }

  // 拖尾繪法:沿速度方向畫短線(motion blur),不需背景疊加,任何底圖皆可用
  drawTrails(ctx, color = '#4aa3ff', k = 0.05) {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    for (const p of this.pool) {
      if (!p.alive) continue
      const a = Math.max(0, Math.min(1, p.life / p.maxLife))
      ctx.globalAlpha = 0.25 + a * 0.55
      ctx.lineWidth = p.r * 1.5
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * k, p.y - p.vy * k)
      ctx.stroke()
    }
    ctx.restore()
  }

  clear() {
    for (const p of this.pool) p.alive = false
  }
}
