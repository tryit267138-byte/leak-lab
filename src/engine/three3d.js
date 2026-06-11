import * as THREE from 'three'

// 行動裝置粒子上限 2000、桌機 8000(以觸控能力與畫面寬度判斷)
export function isMobileDevice() {
  return (navigator.maxTouchPoints || 0) > 0 && window.innerWidth < 820
}
export function particleCap() {
  return isMobileDevice() ? 2000 : 8000
}

// 建立 WebGL renderer;失敗回傳 null(呼叫端顯示 fallback,不可白屏)
export function createRenderer(container) {
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobileDevice(), alpha: false, powerPreference: 'high-performance' })
    if (!renderer.getContext()) return null
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)
    return renderer
  } catch (e) {
    return null
  }
}

// FPS 監測:連續 windowSec 秒 < minFps 時呼叫 onDrop 一次(可重複觸發,呼叫端自行降載)
export class FpsMonitor {
  constructor({ minFps = 30, windowSec = 3, onDrop } = {}) {
    this.minFps = minFps
    this.windowSec = windowSec
    this.onDrop = onDrop
    this.belowSince = 0
    this.fps = 60
    this._acc = 0
    this._frames = 0
  }
  // 每幀呼叫,dt 秒,t 累計秒
  tick(dt, t) {
    this._acc += dt; this._frames++
    if (this._acc >= 0.5) { this.fps = this._frames / this._acc; this._acc = 0; this._frames = 0 }
    if (this.fps < this.minFps) {
      if (!this.belowSince) this.belowSince = t
      else if (t - this.belowSince >= this.windowSec) { this.belowSince = 0; this.onDrop && this.onDrop() }
    } else {
      this.belowSince = 0
    }
  }
}
