// 全站音效:全部用 Web Audio 即時合成,不引入任何音檔。
// 依 autoplay 政策,AudioContext 在「首次使用者互動」後才初始化。
// 共 5 種音(水滴/噴槍/警示/答對/答錯),皆短促。

let ctx = null
let master = null
let muted = false
let spraySrc = null // 噴槍為持續音,單獨管理

const VOL = 0.25

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : VOL
  master.connect(ctx.destination)
}

export function setMuted(m) {
  muted = m
  if (master) master.gain.setTargetAtTime(m ? 0 : VOL, ctx.currentTime, 0.01)
  if (m && spraySrc) stopSpray()
}
export function isMuted() { return muted }

function env(node, t0, attack, dur, peak = 1) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  node.connect(g); g.connect(master)
  return g
}

function blip(freq, dur, type, peak, sweepTo) {
  if (!ctx || muted) return
  const t0 = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur)
  env(o, t0, 0.004, dur, peak)
  o.start(t0); o.stop(t0 + dur + 0.02)
}

function noiseBurst(dur, peak, lp) {
  if (!ctx || muted) return
  const t0 = ctx.currentTime
  const n = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = ctx.createBufferSource(); src.buffer = buf
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp
  src.connect(f)
  env(f, t0, 0.005, dur, peak)
  src.start(t0)
}

export const sfx = {
  drop() { blip(880, 0.12, 'sine', 0.6, 320) },           // 水滴
  warn() { blip(440, 0.18, 'square', 0.4); setTimeout(() => blip(330, 0.2, 'square', 0.4), 90) }, // 警示(雙音)
  correct() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.5), i * 80)) }, // 答對(上行)
  wrong() { blip(196, 0.28, 'sawtooth', 0.4, 130) },      // 答錯(低沉下滑)
  // 噴槍:持續濾波白噪,start/stop 控制
  spray() {
    if (!ctx || muted || spraySrc) return
    const n = ctx.sampleRate * 1
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7
    const g = ctx.createGain(); g.gain.setTargetAtTime(0.12, ctx.currentTime, 0.02)
    src.connect(f); f.connect(g); g.connect(master)
    src.start(); spraySrc = { src, g }
  },
}

export function stopSpray() {
  if (!spraySrc) return
  try { spraySrc.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03); spraySrc.src.stop(ctx.currentTime + 0.1) } catch (e) {}
  spraySrc = null
}
