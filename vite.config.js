import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base 可由環境變數覆寫:GitHub Pages 走子路徑 /leak-lab/,本機/Vercel 走根 /
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
