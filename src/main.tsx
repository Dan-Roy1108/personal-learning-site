import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { UiSettingsProvider } from './contexts/UiSettingsContext'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <UiSettingsProvider><AuthProvider><App /></AuthProvider></UiSettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
