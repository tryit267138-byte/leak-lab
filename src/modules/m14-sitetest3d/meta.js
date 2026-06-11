// 輕量 meta(不 import three.js),供 registry 靜態載入;Component 走 dynamic import 拆 chunk。
export const meta = {
  key: 'm14-sitetest3d',
  title: '3D 高壓水槍實測場',
  category: '3D',
  description: 'm06 的第一人稱 3D 版,拖曳控制噴頭、判定共用 physics.js 與 m06 一致。',
  difficulty: 3,
}
