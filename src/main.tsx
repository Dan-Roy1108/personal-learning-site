import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { UiSettingsProvider } from './contexts/UiSettingsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UiSettingsProvider><App /></UiSettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
