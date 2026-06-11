import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { injectCssVars } from './ui/tokens.js'
import './index.css'

injectCssVars()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
