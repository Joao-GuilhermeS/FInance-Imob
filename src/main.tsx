import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './financial.css'
import './registry.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
