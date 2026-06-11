// 設計系統單一來源(Single Source of Truth)。
// JS 端(canvas 繪圖)直接 import 此檔;CSS 端由 main.jsx 在啟動時注入為 CSS 變數。
// 全站顏色/字體/圓角/陰影一律引用此處,禁止散落硬碼。

export const tokens = {
  color: {
    bg: '#0d1216',        // 背景
    panel: '#141b21',     // 面板
    border: '#263340',    // 邊框
    primary: '#66D3C0',   // 主色
    warn: '#ff7b6b',      // 警示
    hint: '#ffd27b',      // 提示
    text: '#e7eef2',      // 主要文字
    textDim: '#8aa0ab',   // 次要文字
    water: '#4aa3ff',     // 水(2D 粒子)
  },
  font: {
    family: 'system-ui, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
    titleSpacing: '2px',  // 標題字距
  },
  radius: '10px',
  shadow: '0 4px 24px rgba(0,0,0,0.4)',
}

// 將 tokens 注入 :root 成為 CSS 變數,供 CSS modules 以 var(--ll-*) 引用。
export function injectCssVars(root = document.documentElement) {
  const c = tokens.color
  root.style.setProperty('--ll-bg', c.bg)
  root.style.setProperty('--ll-panel', c.panel)
  root.style.setProperty('--ll-border', c.border)
  root.style.setProperty('--ll-primary', c.primary)
  root.style.setProperty('--ll-warn', c.warn)
  root.style.setProperty('--ll-hint', c.hint)
  root.style.setProperty('--ll-text', c.text)
  root.style.setProperty('--ll-text-dim', c.textDim)
  root.style.setProperty('--ll-water', c.water)
  root.style.setProperty('--ll-font', tokens.font.family)
  root.style.setProperty('--ll-title-spacing', tokens.font.titleSpacing)
  root.style.setProperty('--ll-radius', tokens.radius)
  root.style.setProperty('--ll-shadow', tokens.shadow)
}
