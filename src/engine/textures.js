import * as THREE from 'three'

// 程式化材質貼圖(canvas 生成,無外部資產)。給 3D 場景做真實 PBR 表面:
// 混凝土(顆粒+法線起伏)、磁磚(縫溝法線)、金屬(粗糙度)。皆可重複鋪排。

function cv(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return c
}

// 平滑值噪(小格隨機 → 放大內插 + 細顆粒)
function noiseCanvas(size, base, varA, grain) {
  const c = cv(size), ctx = c.getContext('2d')
  const s = Math.max(4, size >> 3)
  const small = cv(s), sctx = small.getContext('2d')
  const id = sctx.createImageData(s, s)
  for (let i = 0; i < id.data.length; i += 4) {
    const v = base + (Math.random() * 2 - 1) * varA
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255
  }
  sctx.putImageData(id, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(small, 0, 0, size, size)
  // 細顆粒
  const fine = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < fine.data.length; i += 4) {
    const g = (Math.random() * 2 - 1) * grain
    fine.data[i] += g; fine.data[i + 1] += g; fine.data[i + 2] += g
  }
  ctx.putImageData(fine, 0, 0)
  return c
}

// 由高度圖(灰階 canvas)算法線貼圖
function normalFromHeight(heightCanvas, strength = 2) {
  const size = heightCanvas.width
  const hctx = heightCanvas.getContext('2d')
  const h = hctx.getImageData(0, 0, size, size).data
  const out = cv(size), octx = out.getContext('2d')
  const nd = octx.createImageData(size, size)
  const at = (x, y) => h[((((y + size) % size) * size + ((x + size) % size)) << 2)] / 255
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) << 2
      nd.data[i] = ((dx / len) * 0.5 + 0.5) * 255
      nd.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255
      nd.data[i + 2] = (1 / len * 0.5 + 0.5) * 255
      nd.data[i + 3] = 255
    }
  }
  octx.putImageData(nd, 0, 0)
  return out
}

// 磁磚高度圖(縫溝較暗=凹)
function tileHeight(size, cols) {
  const c = cv(size), ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size)
  const step = size / cols, grout = Math.max(2, size / cols * 0.08)
  ctx.fillStyle = '#000'
  for (let i = 0; i <= cols; i++) {
    ctx.fillRect(i * step - grout / 2, 0, grout, size)
    ctx.fillRect(0, i * step - grout / 2, size, grout)
  }
  return c
}

function toTex(canvas, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 4
  return t
}

let _cache = null
export function materialMaps() {
  if (_cache) return _cache
  const concAlb = noiseCanvas(256, 96, 18, 10)
  const concH = noiseCanvas(256, 128, 60, 8)
  const tileH = tileHeight(256, 6)
  _cache = {
    concrete: { map: toTex(concAlb, 2), normalMap: toTex(normalFromHeight(concH, 2.2), 2), roughnessMap: toTex(concH, 2) },
    tile: { map: toTex(noiseCanvas(256, 150, 10, 6), 1), normalMap: toTex(normalFromHeight(tileH, 3), 1) },
  }
  return _cache
}
