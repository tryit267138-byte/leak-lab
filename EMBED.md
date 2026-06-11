# leak-lab 嵌入 bqiat-learn 指南

兩種嵌入方式:**iframe**(最快、零耦合)或 **React 元件**(同站、共享狀態)。
兩者都透過 `window` 的 `lab:complete` 事件回報完成度給進度系統。

---

## 方式 A:iframe(推薦先用這個)

leak-lab 是獨立 Vite 應用,`git push` 後由 Vercel 部署。把整站或單一模組以 iframe 內嵌:

```html
<!-- 整站(含首頁卡片牆) -->
<iframe src="https://leak-lab.vercel.app/" width="100%" height="640"
        style="border:0;border-radius:10px" allow="autoplay" title="虛擬漏水實驗室"></iframe>
```

### 直接開到某個模組

開新分頁時可用網址參數略過首頁(若要支援,於 `App.jsx` 讀 `?m=` 設定 `setCurrent`;目前預設進首頁)。在 bqiat-learn 端建議用 component_key 對照表(見下)決定要嵌哪個模組。

### 接收完成事件(跨 iframe)

讓 leak-lab 在完成時 `postMessage` 給父視窗。於 `engine/labEvents.js` 的 `emitComplete` 內已 `dispatchEvent`;再加一行轉發即可:

```js
// engine/labEvents.js(嵌入時可加)
window.parent && window.parent.postMessage({ type: 'lab:complete', key, score: s }, '*')
```

父頁(bqiat-learn)接收:

```js
window.addEventListener('message', (e) => {
  if (e.data?.type === 'lab:complete') saveProgress(e.data.key, e.data.score)
})
```

---

## 方式 B:React 元件(同一個 React app 內)

leak-lab 的模組是標準 `{ meta, Component }`。可把 `src/modules`、`src/engine`、`src/ui`、`src/registry.js` 併入 bqiat-learn,直接渲染單一模組:

```jsx
import { byKey } from 'leak-lab/registry'

function LeakModule({ componentKey }) {
  const entry = byKey[componentKey]          // 例:'m06-waterjet'
  if (!entry) return null
  const C = entry.Component                  // 3D 模組為 React.lazy,需包 <Suspense>
  return <Suspense fallback={<div>載入中…</div>}><C /></Suspense>
}
```

依賴:`three`、`zustand`(leak-lab 既有);3D 模組(m13/m14)以 dynamic import 拆 chunk,不影響 2D 首載。

---

## registry component_key 對照建議

bqiat-learn 課程節點 → leak-lab `component_key`(即 `meta.key`):

| 主題 | component_key | 分類 |
|---|---|---|
| 正負水壓 / 背水面 | `m01-pressure` | 壓力 |
| 毛細現象 / 壁癌成因 | `m02-capillary` | 水路 |
| 窗框風雨 / 水密等級 | `m03-window` | 檢測 |
| 冷凝 vs 漏水判別 | `m04-condense` | 環境 |
| 檢測員綜合診斷 | `m05-inspector` | 檢測 |
| 高壓水槍灑水試驗 | `m06-waterjet` | 檢測 |
| 屋頂積水與排水 | `m07-roofdrain` | 壓力 |
| 陽台門檻與落水頭 | `m08-balcony` | 環境 |
| 層縫/施工縫滲透 | `m09-joint` | 水路 |
| 浴室隔戶滲漏 | `m10-bathroom` | 水路 |
| 風揚水 / 滴水線 | `m11-winddriven` | 水路 |
| 防水層全生命週期成本 | `m12-aging` | 材料 |
| 建築水路 3D 導覽 | `m13-building3d` | 3D |
| 3D 高壓水槍實測場 | `m14-sitetest3d` | 3D |

> 建議 bqiat-learn 的 `lesson` 表加一欄 `component_key`,值即上表;前端依此渲染對應模組。

---

## lab:complete → 進度系統(`.maybeSingle()` 模式)

每個模組在達成自訂完成條件時發送:

```js
window.dispatchEvent(new CustomEvent('lab:complete', { detail: { key, score } }))
// key: component_key;score: 0~100(同一 key 僅在分數提升時再次發送)
```

各模組完成條件(已實作):

| key | 完成條件 | score |
|---|---|---|
| m01 | 皮膜被頂破 或 結晶止水完成 | 100 |
| m02 | 縫寬調到 ≤0.3mm(看到髮絲裂縫 150+) | 100 |
| m03 | 出現室內滲水 | 100 |
| m04 | 測驗作答 | 答對 100 / 答錯 40 |
| m05 | 診斷作答 | 答對 100 / 答錯 40 |
| m06 | 定位弱點 | 每處 50,兩處 100 |
| m07 | 積水覆蓋裂縫並滲漏 | 100 |
| m08 | 水位漫過門檻 | 100 |
| m09 | 沿冷縫滲漏 | 100 |
| m10 | 牆體飽和、背水面長壁癌 | 100 |
| m11 | 風揚水越過滴水線 | 100 |
| m12 | 時間軸拉到 15 年 | 100 |
| m13 | 看完全部八條水路 | 100 |
| m14 | 定位弱點 | 每處 50,兩處 100 |

### 接進 bqiat-learn(Supabase `.maybeSingle()` 寫法)

```js
window.addEventListener('lab:complete', async (e) => {
  const { key, score } = e.detail

  // 1) 先查既有進度(.maybeSingle():0 或 1 列都不丟錯)
  const { data: existing } = await supabase
    .from('lab_progress')
    .select('id, score')
    .eq('user_id', userId)
    .eq('component_key', key)
    .maybeSingle()

  // 2) 僅在分數提升時 upsert
  if (!existing || score > existing.score) {
    await supabase.from('lab_progress').upsert({
      user_id: userId,
      component_key: key,
      score,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,component_key' })
  }
})
```

建議資料表:

```sql
create table lab_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  component_key text not null,   -- 對照上表
  score int not null check (score between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (user_id, component_key)
);
```

---

## 注意事項

- **音效**:依瀏覽器 autoplay 政策,`AudioContext` 在首次使用者互動後才初始化;iframe 需 `allow="autoplay"`。右上角有全域靜音開關(預設開聲音)。
- **3D 模組**:`m13`/`m14` 用 WebGL;初始化失敗會顯示 fallback 引導文字與「改用 2D」連結,不會白屏。
- **行動裝置**:3D 粒子上限自動降為 2000(桌機 8000);FPS 連續 3 秒 <30 自動降載並顯示「效能模式」。
- **物理一致性**:所有判定數值集中於 `engine/physics.js`;m06 與 m14(3D 版)共用同一組高壓水槍判定函式,同參數同結果。
