import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from '../locales/translations'

type Theme = 'light' | 'dark'
type UiSettingsValue = { language: Language; theme: Theme; toggleLanguage: () => void; toggleTheme: () => void; t: (key: TranslationKey) => string }
const UiSettingsContext = createContext<UiSettingsValue | null>(null)
const THEME_KEY = 'shiguang-theme'
const LANGUAGE_KEY = 'shiguang-language'

export function UiSettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => window.localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'zh-CN')
  const [theme, setTheme] = useState<Theme>(() => window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light')
  useEffect(() => { document.documentElement.dataset.theme = theme; window.localStorage.setItem(THEME_KEY, theme) }, [theme])
  useEffect(() => { document.documentElement.lang = language; window.localStorage.setItem(LANGUAGE_KEY, language) }, [language])
  const value = useMemo<UiSettingsValue>(() => ({ language, theme, toggleLanguage: () => setLanguage((current) => current === 'zh-CN' ? 'en' : 'zh-CN'), toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'), t: (key) => translations[language][key] }), [language, theme])
  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>
}

export function useUiSettings() {
  const value = useContext(UiSettingsContext)
  if (!value) throw new Error('useUiSettings must be used within UiSettingsProvider')
  return value
}
