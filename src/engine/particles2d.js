// 共用 2D 粒子引擎。各模組複用此引擎做水/水滴/水束模擬。
// 純 canvas,無外部依賴。座標系:像素,y 向下為正。

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

  clear() {
    for (const p of this.pool) p.alive = false
  }
}
