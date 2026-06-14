import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// 程式化環境光(RoomEnvironment,無外部 HDR 資產)→ PMREM,供 PBR 反射用。
// 沒有它,金屬/玻璃的 metalness/反射會是死黑。
export function makeEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  return env
}

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
