import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { DEFAULT_FIRM_ID, themeCss } from './config/firm'
import { FIRM } from './config/firms'

const style = document.createElement('style')
style.textContent = themeCss(FIRM.colors)
document.head.appendChild(style)
if (FIRM.id !== DEFAULT_FIRM_ID) document.title = `${FIRM.name} · Retirement planner`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App firm={FIRM} />
  </StrictMode>,
)
