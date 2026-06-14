import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { useStore } from '../../store.js'
import { createRenderer, particleCap, FpsMonitor, isMobileDevice } from '../../engine/three3d.js'
import { emitComplete } from '../../engine/labEvents.js'
import { Panel } from '../../ui/Panel.jsx'
import { Button } from '../../ui/Button.jsx'
import shared from '../module.module.css'
export { meta } from './meta.js'

// 部位 → 弱點清單 + 對應 2D 實驗
const PART_INFO = {
  roof: { label: '屋頂', weak: ['洩水坡不足→積水', '落水頭堵塞', '防水層龜裂'], links: [['m07-roofdrain', 'm07 屋頂積水']] },
  parapet: { label: '女兒牆', weak: ['滴水線失效', '壓頂裂縫', '內側未做防水'], links: [['m11-winddriven', 'm11 風揚水']] },
  window: { label: '窗', weak: ['填縫老化', '水密等級不足', '窗台未洩水'], links: [['m03-window', 'm03 窗框風雨'], ['m06-waterjet', 'm06 高壓水槍']] },
  balcony: { label: '陽台', weak: ['門檻過低', '向內洩水坡', '落水頭堵塞'], links: [['m08-balcony', 'm08 陽台門檻']] },
  bathroom: { label: '浴室', weak: ['防水層高度不足', '磚縫劣化', '背水面析出壁癌'], links: [['m10-bathroom', 'm10 浴室隔戶']] },
  slabjoint: { label: '樓板交界(冷縫)', weak: ['無止水帶', '冷縫不密實', '水平位移滲漏'], links: [['m09-joint', 'm09 層縫滲透']] },
  exwall: { label: '外牆', weak: ['正/負水壓滲漏', '裂縫毛細上升', '塗膜起鼓'], links: [['m01-pressure', 'm01 正負水壓'], ['m02-capillary', 'm02 毛細']] },
  basement: { label: '地下室', weak: ['典型負水壓(背水面)', '結構裂縫', '皮膜被頂破'], links: [['m01-pressure', 'm01 正負水壓']] },
}

// 八條經典水路:points(建築座標)+ 解說字卡
const PATHS = [
  { name: '① 屋頂裂縫→樓板→天花板', color: 0x4aa3ff, pts: [[0.4, 3.5, 0], [0.4, 1.3, 0], [0.6, 1.0, 0.4], [0.7, -0.2, 0.8]], card: '屋頂裂縫的水穿過樓板,從下層天花板滴出。漏點在天花板,病根在屋頂。' },
  { name: '② 窗框→窗台內側', color: 0x4aa3ff, pts: [[3, 2.3, 0.6], [2.8, 2.2, 0.8], [2.5, 2.0, 1.0], [2.3, 1.9, 1.0]], card: '風雨壓超過窗的水密等級,水從窗框縫滲到室內窗台。' },
  { name: '③ 女兒牆越線→側牆', color: 0x4aa3ff, pts: [[3, 4, 0], [3.15, 3.6, 0], [3, 2.6, -0.4], [3, 1.4, -0.8]], card: '強風揚水越過滴水線,灌入女兒牆內側,順側牆由上往下濕。' },
  { name: '④ 陽台門檻→室內地板', color: 0x4aa3ff, pts: [[-1.5, 1.3, 2.7], [-1.5, 1.3, 1.9], [-1.5, 1.32, 1.0], [-1.5, 1.32, 0.3]], card: '落水頭堵+暴雨使陽台水位漫過門檻,流進室內地板。' },
  { name: '⑤ 浴室磚縫→隔戶牆背面', color: 0x4aa3ff, pts: [[-2, 2.5, -0.8], [-2.4, 2.3, -1.2], [-2.7, 2.0, -1.6], [-2.85, 1.8, -1.8]], card: '浴室水從磚縫滲入牆體,飽和後在隔壁戶背水面析出壁癌。' },
  { name: '⑥ 冷縫→水平位移→遠處滴出', color: 0x4aa3ff, pts: [[3, 1.25, -1], [1, 1.25, -0.9], [-1, 1.25, -0.7], [-2.2, 1.2, -0.5], [-2.2, 0.2, -0.4]], card: '水沿樓板冷縫水平跑很遠,出水點離進水點 1~3m——漏≠進水。' },
  { name: '⑦ 牆腳毛細→垂直上升', color: 0x66D3C0, pts: [[-2.85, -1, 0.9], [-2.85, -0.4, 0.9], [-2.85, 0.3, 0.9], [-2.85, 0.9, 0.9]], card: '唯一向上的水路:牆腳水沿細縫毛細上升,造成牆腳壁癌。', up: true },
  { name: '⑧ 外牆裂縫→室內', color: 0x4aa3ff, pts: [[3, 0.3, -0.4], [2.8, 0.2, 0], [2.5, 0.0, 0.4], [2.3, -0.1, 0.6]], card: '外牆裂縫在正水壓下把水推進室內。' },
]

export function Component() {
  const containerRef = useRef(null)
  const setCurrent = useStore((s) => s.setCurrent)
  const sceneState = useRef({ showPaths: false, selPath: -1 }).current
  const [selPart, setSelPart] = useState(null)
  const [showPaths, setShowPaths] = useState(false)
  const [selPath, setSelPath] = useState(-1)
  const [perfMode, setPerfMode] = useState(false)
  const [fps, setFps] = useState(60)
  const [failed, setFailed] = useState(false)
  const api = useRef({})

  useEffect(() => {
    const container = containerRef.current
    const renderer = createRenderer(container)
    if (!renderer) { setFailed(true); return }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0d10)
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(7, 5, 9)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 1, 0)
    controls.minDistance = 5; controls.maxDistance = 22

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(6, 10, 8); scene.add(dir)

    // ── Bloom 後製:讓水路發光粒子真正「發光」──
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), isMobileDevice() ? 0.35 : 0.5, 0.4, 0.85)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    let useBloom = true

    // ── 程式化剖切建築(前面 +z 開放,室內可見)──
    const parts = []
    const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.05 })
    const addBox = (w, h, d, x, y, z, color, part) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color))
      m.position.set(x, y, z); m.userData.part = part
      m.userData.baseEmissive = 0x000000
      scene.add(m); parts.push(m); return m
    }
    // 樓板
    addBox(6, 0.2, 4, 0, -1, 0, 0x3a4350, 'slabjoint')   // 地面層樓板
    addBox(6, 0.2, 4, 0, 1.2, 0, 0x3a4350, 'slabjoint')  // 樓層交界(冷縫)
    addBox(6, 0.25, 4, 0, 3.4, 0, 0x4a5560, 'roof')      // 屋頂板
    // 牆(背 + 左 + 右,前面省略做剖切)
    const storeys = [[-2, '基'], [0.1, '下'], [2.3, '上']]
    storeys.forEach(([y], i) => {
      const tag = i === 0 ? 'basement' : 'exwall'
      addBox(6, 2.1, 0.2, 0, y, -2, 0x556069, tag)      // 背牆
      addBox(0.2, 2.1, 4, -3, y, 0, 0x4e5860, tag)      // 左牆
      addBox(0.2, 2.1, 4, 3, y, 0, 0x4e5860, tag)       // 右牆
    })
    // 窗(右牆,下層 + 上層)
    addBox(0.28, 1.0, 0.8, 3, 0.2, 0.6, 0x223a48, 'window')
    addBox(0.28, 1.0, 0.8, 3, 2.3, 0.6, 0x223a48, 'window')
    // 浴室(上層左側,別色塊)
    addBox(1.5, 1.9, 1.6, -2.05, 2.25, -1, 0x2f6a5a, 'bathroom')
    // 陽台(上層左前,伸出 +z)+ 欄杆
    addBox(2, 0.15, 1.3, -1.5, 1.2, 2.6, 0x3a4350, 'balcony')
    addBox(2, 0.5, 0.08, -1.5, 1.5, 3.2, 0x556069, 'balcony')
    // 女兒牆(屋頂周邊低牆)
    addBox(6, 0.6, 0.2, 0, 3.85, -2, 0x6a747c, 'parapet')
    addBox(0.2, 0.6, 4, -3, 3.85, 0, 0x6a747c, 'parapet')
    addBox(0.2, 0.6, 4, 3, 3.85, 0, 0x6a747c, 'parapet')
    addBox(6, 0.6, 0.2, 0, 3.85, 2, 0x6a747c, 'parapet')

    // ── 八條水路:曲線 + 流動粒子 ──
    const curves = PATHS.map((p) => new THREE.CatmullRomCurve3(p.pts.map((c) => new THREE.Vector3(...c))))
    // 預先取樣每條曲線(避免每幀 getPointAt 的弧長查找,8000 顆才能 60fps)
    const SAMPLES = 240
    const curvePts = curves.map((c) => c.getSpacedPoints(SAMPLES))
    const lines = curves.map((c, i) => {
      const g = new THREE.BufferGeometry().setFromPoints(c.getPoints(50))
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: PATHS[i].color, transparent: true, opacity: 0.35 }))
      l.visible = false; scene.add(l); return l
    })
    const CAP = particleCap()
    let nParticles = CAP
    const pGeo = new THREE.SphereGeometry(0.034, 6, 6)
    const pMat = new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    let inst = new THREE.InstancedMesh(pGeo, pMat, CAP)
    inst.visible = false; scene.add(inst)
    const dummy = new THREE.Object3D()
    let pData = []
    const seedParticles = (n) => {
      pData = []
      for (let i = 0; i < n; i++) pData.push({ ci: i % curves.length, t: Math.random(), sp: 0.06 + Math.random() * 0.05 })
    }
    seedParticles(nParticles)

    // ── 互動:點擊部位 ──
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let downX = 0, downY = 0, sel = null
    const onDown = (e) => { downX = e.clientX; downY = e.clientY }
    const onUp = (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return // 拖曳→旋轉,不選取
      const r = renderer.domElement.getBoundingClientRect()
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(parts, false)[0]
      if (sel) { sel.material.emissive.setHex(0x000000) }
      if (hit) {
        sel = hit.object; sel.material.emissive.setHex(0x224b44)
        api.current.onPart && api.current.onPart(sel.userData.part)
      } else { sel = null; api.current.onPart && api.current.onPart(null) }
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    // ── 迴圈 ──
    const fpsMon = new FpsMonitor({ onDrop: () => {
      // 先關 Bloom(最貴),再降粒子數
      if (useBloom) { useBloom = false; api.current.onPerf && api.current.onPerf(true); return }
      if (nParticles <= 250) return
      nParticles = Math.floor(nParticles / 2); seedParticles(nParticles)
    } })
    let raf = 0, last = 0, tAcc = 0, fpsAcc = 0
    const loop = (tms) => {
      const t = tms / 1000
      const dt = last ? Math.min(t - last, 0.05) : 0.016; last = t; tAcc += dt
      controls.update()
      // 水路顯示
      const sp = sceneState.showPaths
      inst.visible = sp
      lines.forEach((l, i) => { l.visible = sp; l.material.opacity = sceneState.selPath === i ? 0.95 : 0.3 })
      if (sp) {
        for (let i = 0; i < nParticles; i++) {
          const p = pData[i]; p.t += p.sp * dt; if (p.t > 1) p.t -= 1
          const v = curvePts[p.ci][(p.t * SAMPLES) | 0]
          dummy.position.copy(v); dummy.scale.setScalar(sceneState.selPath < 0 || sceneState.selPath === p.ci ? 1 : 0.35)
          dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix)
        }
        inst.count = nParticles; inst.instanceMatrix.needsUpdate = true
      }
      if (useBloom) composer.render(); else renderer.render(scene, camera)
      fpsMon.tick(dt, t)
      fpsAcc += dt; if (fpsAcc > 0.5) { fpsAcc = 0; api.current.onFps && api.current.onFps(Math.round(fpsMon.fps)) }
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
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      composer.dispose()
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { Array.isArray(o.material) ? o.material.forEach((m) => m.dispose()) : o.material.dispose() } })
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  // React → three 橋接
  api.current.onPart = (p) => setSelPart(p)
  api.current.onPerf = (v) => setPerfMode(v)
  api.current.onFps = (v) => setFps(v)
  const viewed = useRef(new Set()).current
  const togglePaths = () => { const v = !showPaths; setShowPaths(v); sceneState.showPaths = v }
  const pickPath = (i) => {
    const v = selPath === i ? -1 : i; setSelPath(v); sceneState.selPath = v
    if (v >= 0) { viewed.add(i); if (viewed.size >= PATHS.length) emitComplete('m13-building3d', 100); if (!showPaths) togglePaths() }
  }

  const info = selPart ? PART_INFO[selPart] : null
  return (
    <div className={shared.layout}>
      <div className={shared.stageCol}>
        <div className={shared.three} ref={containerRef}>
          {failed && (
            <div className={shared.fallback}>
              <div>⚠ 此裝置無法初始化 3D(WebGL)。</div>
              <Button variant="primary" onClick={() => setCurrent('m07-roofdrain')}>改用 2D 模組</Button>
            </div>
          )}
          {!failed && info && (
            <div className={[shared.overlay, shared.partPanel].join(' ')}>
              <h4>{info.label}</h4>
              <ul>{info.weak.map((w, i) => <li key={i}>{w}</li>)}</ul>
              {info.links.map(([k, l]) => <button key={k} className={shared.linkBtn} onClick={() => setCurrent(k)}>{l} →</button>)}
            </div>
          )}
          {!failed && selPath >= 0 && (
            <div className={[shared.overlay, shared.card].join(' ')}>{PATHS[selPath].card}</div>
          )}
          {!failed && perfMode && <div className={[shared.overlay, shared.perfBadge].join(' ')}>效能模式</div>}
          {!failed && <div className={[shared.overlay, shared.fpsBadge].join(' ')}>{fps} fps</div>}
        </div>
      </div>
      <div className={shared.controls}>
        <Panel title="操作">
          <p className={shared.note}>拖曳旋轉、滾輪/雙指縮放。<b>點任一部位</b>看弱點清單與對應 2D 實驗。</p>
          <Button variant="toggle" active={showPaths} onClick={togglePaths}>顯示水路:{showPaths ? '開' : '關'}</Button>
        </Panel>
        <Panel title="八條經典水路">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PATHS.map((p, i) => (
              <Button key={i} variant="toggle" active={selPath === i} onClick={() => pickPath(i)}>{p.name}</Button>
            ))}
          </div>
        </Panel>
        <Panel title="說明">
          <p className={shared.note}>3D 是<b>空間理解</b>工具:看清水從哪進、怎麼跑、從哪出。物理正確性仍由各 2D 模組負責。第 ⑦ 條(毛細)是唯一<b>向上</b>的水路。</p>
        </Panel>
      </div>
    </div>
  )
}
