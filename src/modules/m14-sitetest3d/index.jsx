import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { useStore } from '../../store.js'
import { createRenderer, particleCap, FpsMonitor, isMobileDevice } from '../../engine/three3d.js'
import { WATERJET_THRESH, waterjetDoseRate, waterjetOverpressure } from '../../engine/physics.js'
import { sfx, stopSpray } from '../../engine/audio.js'
import { emitComplete } from '../../engine/labEvents.js'
import { Panel } from '../../ui/Panel.jsx'
import { Slider } from '../../ui/Slider.jsx'
import { Button } from '../../ui/Button.jsx'
import { Hud } from '../../ui/Hud.jsx'
import shared from '../module.module.css'
export { meta } from './meta.js'

const R = (a, b) => a + Math.random() * (b - a)
// 窗框中心與尺寸(z=-3 牆面)
const WIN = { x: 0, y: 1.2, z: -3, w: 2.4, h: 1.8 }
function perimeterPoint() {
  const hw = WIN.w / 2, hh = WIN.h / 2
  const s = Math.random() * 4 | 0
  if (s === 0) return new THREE.Vector3(WIN.x + R(-hw, hw), WIN.y + hh, WIN.z)
  if (s === 1) return new THREE.Vector3(WIN.x + R(-hw, hw), WIN.y - hh, WIN.z)
  if (s === 2) return new THREE.Vector3(WIN.x - hw, WIN.y + R(-hh, hh), WIN.z)
  return new THREE.Vector3(WIN.x + hw, WIN.y + R(-hh, hh), WIN.z)
}
function nearFrame(p) {
  const hw = WIN.w / 2, hh = WIN.h / 2
  const onEdge = Math.abs(Math.abs(p.x - WIN.x) - hw) < 0.18 || Math.abs(Math.abs(p.y - WIN.y) - hh) < 0.18
  return onEdge && Math.abs(p.x - WIN.x) < hw + 0.2 && Math.abs(p.y - WIN.y) < hh + 0.2
}

export function Component() {
  const containerRef = useRef(null)
  const joyRef = useRef(null)
  const setCurrent = useStore((s) => s.setCurrent)
  const st = useRef({ pressure: 90, station: { x: 0, f: 0 }, distCm: 35, pointer: new THREE.Vector2(0, 0), spraying: false }).current
  const [pressure, setPressure] = useState(90)
  const [found, setFound] = useState(0)
  const [falseN, setFalseN] = useState(0)
  const [distCm, setDistCm] = useState(35)
  const [perfMode, setPerfMode] = useState(false)
  const [fps, setFps] = useState(60)
  const [failed, setFailed] = useState(false)
  const [mobile] = useState(isMobileDevice())
  const api = useRef({})

  const setP = (v) => { st.pressure = v; setPressure(v) }

  useEffect(() => {
    const container = containerRef.current
    const renderer = createRenderer(container)
    if (!renderer) { setFailed(true); return }
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0e1419)
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.05, 100)
    const camBase = new THREE.Vector3(0, 1.4, 0.2)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(2, 4, 2); scene.add(dl)

    // Bloom 後製:噴流/濺射發光
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), isMobileDevice() ? 0.35 : 0.55, 0.4, 0.75)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    let useBloom = true

    // 牆 + 窗框 + 玻璃
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshStandardMaterial({ color: 0x2a333c, roughness: 1 }))
    wall.position.set(0, 1.5, WIN.z - 0.05); scene.add(wall)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(WIN.w + 0.3, WIN.h + 0.3, 0.12), new THREE.MeshStandardMaterial({ color: 0x46c79a }))
    frame.position.set(WIN.x, WIN.y, WIN.z); scene.add(frame)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, WIN.h), new THREE.MeshStandardMaterial({ color: 0x16323f, transparent: true, opacity: 0.6 }))
    glass.position.set(WIN.x, WIN.y, WIN.z + 0.07); scene.add(glass)

    // 弱點(隱藏)+ 命中標記
    let weaks = [perimeterPoint(), perimeterPoint()].map((p) => ({ p, dose: 0, found: false }))
    let goodDose = 0
    const markerGeo = new THREE.SphereGeometry(0.09, 10, 10)
    const foundMat = new THREE.MeshBasicMaterial({ color: 0xff8a78 })
    const falseMat = new THREE.MeshBasicMaterial({ color: 0xffd27b })
    const markers = []

    // 噴流 + 濺射粒子(InstancedMesh)
    const CAP = particleCap()
    let nJet = Math.min(1500, Math.floor(CAP * 0.5)), nSpl = Math.min(500, CAP - nJet)
    // 暗藍加成色:疊加後呈「發光水流」而非白爆
    const jetMat = new THREE.MeshBasicMaterial({ color: 0x2c5570, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    const splMat = new THREE.MeshBasicMaterial({ color: 0x356a86, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    const jet = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 5, 5), jetMat, CAP)
    const spl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.016, 5, 5), splMat, CAP)
    scene.add(jet); scene.add(spl)
    const dummy = new THREE.Object3D()
    let jetP = [], splP = []
    const seed = () => {
      jetP = Array.from({ length: nJet }, () => ({ u: Math.random(), sp: R(1.5, 2.6) }))
      splP = Array.from({ length: nSpl }, () => ({ life: 0, vx: 0, vy: 0, x: 0, y: 0 }))
    }
    seed()

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -WIN.z) // z=-3
    const ray = new THREE.Raycaster()
    const aim = new THREE.Vector3(WIN.x, WIN.y, WIN.z)
    const nozzle = new THREE.Vector3()

    // 指標:拖曳瞄準 + 按住噴水
    const setPointer = (e) => {
      const r = renderer.domElement.getBoundingClientRect()
      st.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
      st.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
    }
    const down = (e) => { st.spraying = true; setPointer(e); sfx.spray() }
    const move = (e) => { if (st.spraying) setPointer(e) }
    const up = () => { st.spraying = false; stopSpray() }
    renderer.domElement.addEventListener('pointerdown', down)
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerup', up)
    renderer.domElement.addEventListener('pointerleave', up)

    // 鍵盤站位(桌機 ±1m)
    const keys = {}
    const kd = (e) => { keys[e.key.toLowerCase()] = true }
    const ku = (e) => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)

    api.current.newCase = () => {
      weaks = [perimeterPoint(), perimeterPoint()].map((p) => ({ p, dose: 0, found: false }))
      goodDose = 0; markers.forEach((m) => scene.remove(m)); markers.length = 0
      api.current.onFound && api.current.onFound(0); api.current.onFalse && api.current.onFalse(0)
    }

    const fpsMon = new FpsMonitor({ onDrop: () => {
      if (useBloom) { useBloom = false; api.current.onPerf && api.current.onPerf(true); return }
      if (nJet <= 200) return
      nJet = Math.floor(nJet / 2); nSpl = Math.floor(nSpl / 2); seed()
    } })

    let raf = 0, last = 0, fpsAcc = 0
    const loop = (tms) => {
      const t = tms / 1000
      const dt = last ? Math.min(t - last, 0.05) : 0.016; last = t

      // 站位移動(WASD / 搖桿)
      let mx = 0, mf = 0
      if (keys['a']) mx -= 1; if (keys['d']) mx += 1
      if (keys['w']) mf += 1; if (keys['s']) mf -= 1
      if (st.joy) { mx += st.joy.x; mf += -st.joy.y }
      st.station.x = THREE.MathUtils.clamp(st.station.x + mx * dt * 0.8, -1, 1)
      st.station.f = THREE.MathUtils.clamp(st.station.f + mf * dt * 0.8, -1, 1)
      st.distCm = THREE.MathUtils.clamp(35 - st.station.f * 25, 10, 60)
      camera.position.set(camBase.x + st.station.x, camBase.y, camBase.z - st.station.f * 0.9)
      camera.lookAt(WIN.x, WIN.y, WIN.z)
      nozzle.copy(camera.position); nozzle.y -= 0.15; nozzle.z -= 0.2

      // 瞄準點 = 指標射線打到窗面
      ray.setFromCamera(st.pointer, camera)
      ray.ray.intersectPlane(plane, aim) || aim.set(WIN.x, WIN.y, WIN.z)

      // 判定(共用 physics.js,與 m06 同式)
      const over = waterjetOverpressure(st.pressure)
      if (st.spraying) {
        const rate = waterjetDoseRate(st.pressure, st.distCm, dt)
        weaks.forEach((w) => {
          if (!w.found && aim.distanceTo(w.p) < 0.32) {
            w.dose += rate
            if (w.dose > WATERJET_THRESH) {
              w.found = true
              const mk = new THREE.Mesh(markerGeo, foundMat); mk.position.copy(w.p); scene.add(mk); markers.push(mk)
              const fc = weaks.filter((x) => x.found).length
              api.current.onFound && api.current.onFound(fc)
              sfx.correct(); emitComplete('m14-sitetest3d', fc / 2 * 100)
            }
          }
        })
        if (over && nearFrame(aim) && !weaks.some((w) => aim.distanceTo(w.p) < 0.32)) {
          goodDose += waterjetDoseRate(st.pressure, st.distCm, dt)
          if (goodDose > WATERJET_THRESH) {
            goodDose = 0
            const mk = new THREE.Mesh(markerGeo, falseMat); mk.position.copy(aim); scene.add(mk); markers.push(mk)
            api.current.onFalse && api.current.onFalse(markers.filter((m) => m.material === falseMat).length)
            sfx.warn()
          }
        }
      }

      // 噴流粒子
      if (st.spraying) {
        for (let i = 0; i < nJet; i++) {
          const p = jetP[i]; p.u += p.sp * dt * (0.6 + st.pressure / 150); if (p.u > 1) p.u = 0
          dummy.position.lerpVectors(nozzle, aim, p.u)
          // 噴頭處窄、命中處寬;擴散∝噴距(對應 m06 噴距越遠越散)
          const spread = (0.01 + p.u * 0.05) * (0.5 + st.distCm * 0.012)
          dummy.position.x += Math.sin(i * 12.9 + p.u * 30) * spread
          dummy.position.y += Math.cos(i * 7.3 + p.u * 30) * spread
          dummy.scale.setScalar(0.7 + (1 - p.u) * 0.5); dummy.updateMatrix(); jet.setMatrixAt(i, dummy.matrix)
        }
        jet.count = nJet; jet.instanceMatrix.needsUpdate = true
        // 濺射:在瞄準點面內隨機外射
        for (let i = 0; i < nSpl; i++) {
          const s = splP[i]
          if (s.life <= 0 && Math.random() < 0.22) { s.life = R(0.12, 0.3); s.x = aim.x; s.y = aim.y; const a = Math.random() * 6.28, sp = R(0.3, 0.8); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp }
          if (s.life > 0) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; dummy.position.set(s.x, s.y, WIN.z + 0.06); dummy.scale.setScalar(Math.max(0.01, s.life * 2)) }
          else dummy.scale.setScalar(0)
          dummy.updateMatrix(); spl.setMatrixAt(i, dummy.matrix)
        }
        spl.count = nSpl; spl.instanceMatrix.needsUpdate = true
        jet.visible = true; spl.visible = true
      } else { jet.visible = false; spl.visible = false }

      if (useBloom) composer.render(); else renderer.render(scene, camera)
      fpsMon.tick(dt, t)
      fpsAcc += dt; if (fpsAcc > 0.5) { fpsAcc = 0; api.current.onFps && api.current.onFps(Math.round(fpsMon.fps)); api.current.onDist && api.current.onDist(Math.round(st.distCm)) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h)
      composer.setSize(w, h); bloom.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', down)
      renderer.domElement.removeEventListener('pointermove', move)
      renderer.domElement.removeEventListener('pointerup', up)
      renderer.domElement.removeEventListener('pointerleave', up)
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
      composer.dispose()
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { Array.isArray(o.material) ? o.material.forEach((m) => m.dispose()) : o.material.dispose() } })
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  // React → three 橋接
  api.current.onFound = (v) => setFound(v)
  api.current.onFalse = (v) => setFalseN(v)
  api.current.onFps = (v) => setFps(v)
  api.current.onDist = (v) => setDistCm(v)
  api.current.onPerf = (v) => setPerfMode(v)

  // 行動版虛擬搖桿
  useEffect(() => {
    if (!mobile || !joyRef.current) return
    const el = joyRef.current
    let active = false
    const upd = (e) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const x = THREE.MathUtils.clamp((e.clientX - cx) / (r.width / 2), -1, 1)
      const y = THREE.MathUtils.clamp((e.clientY - cy) / (r.height / 2), -1, 1)
      st.joy = { x, y }
    }
    const d = (e) => { active = true; upd(e); e.stopPropagation() }
    const m = (e) => { if (active) { upd(e); e.stopPropagation() } }
    const u = () => { active = false; st.joy = null }
    el.addEventListener('pointerdown', d); el.addEventListener('pointermove', m)
    el.addEventListener('pointerup', u); el.addEventListener('pointerleave', u)
    return () => { el.removeEventListener('pointerdown', d); el.removeEventListener('pointermove', m); el.removeEventListener('pointerup', u); el.removeEventListener('pointerleave', u) }
  }, [mobile])

  const over = pressure > WATERJET_THRESH
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.three} ref={containerRef}>
          {failed && (
            <div className={shared.fallback}>
              <div>⚠ 此裝置無法初始化 3D(WebGL)。</div>
              <Button variant="primary" onClick={() => setCurrent('m06-waterjet')}>改用 2D 的 m06</Button>
            </div>
          )}
          {!failed && (
            <>
              {mobile && <div ref={joyRef} className={shared.overlay} style={{ left: 12, bottom: 12, width: 96, height: 96, borderRadius: '50%', border: '1px solid var(--ll-border)', background: 'rgba(0,0,0,0.3)', pointerEvents: 'auto' }} />}
              {perfMode && <div className={[shared.overlay, shared.perfBadge].join(' ')}>效能模式</div>}
              <div className={[shared.overlay, shared.fpsBadge].join(' ')}>{fps} fps</div>
            </>
          )}
        </div>
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <p className={shared.note}>按住畫面<b>噴水</b>、拖曳<b>瞄準</b>窗框找弱點。{mobile ? '左下搖桿微調站位' : 'WASD 微調站位(±1m)'}。</p>
          <Slider label="水壓" value={pressure} min={30} max={150} unit=" kgf/cm²" onChange={setP} />
          <div style={{ height: 10 }} />
          <Button variant="ghost" onClick={() => api.current.newCase && api.current.newCase()}>下一題(重設弱點)</Button>
        </Panel>
        <Panel title="即時數據">
          <Hud items={[
            { label: '水壓', value: pressure, tone: over ? 'warn' : 'primary' },
            { label: '噴距', value: `${distCm}cm`, tone: 'normal' },
            { label: '定位', value: `${found}/2`, tone: found > 0 ? 'primary' : 'normal' },
            { label: '誤判', value: falseN, tone: falseN ? 'warn' : 'normal' },
          ]} />
        </Panel>
        <Panel title="說明">
          <p className={shared.note}>本場判定<b>直接 import</b> m06 用的 <code>physics.js</code>(<code>waterjetDoseRate</code>、<code>WATERJET_THRESH</code>、<code>waterjetOverpressure</code>)——同水壓、同噴距、同噴測時間,結果與 m06 完全一致。</p>
          <p className={shared.note}>水壓 &gt;100 時連完好填縫也會被打穿(誤判),和 m06 一樣。</p>
        </Panel>
      </div>
    </div>
  )
}
