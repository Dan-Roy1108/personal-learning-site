import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, FileText, House, Info, Moon, Sun } from 'lucide-react'
import { useUiSettings } from '../contexts/UiSettingsContext'

const navItems = [
  { key: 'home', to: '/', icon: House }, { key: 'calendar', to: '/calendar', icon: CalendarDays }, { key: 'notes', to: '/notes', icon: FileText }, { key: 'growth', to: '/stats', icon: BarChart3 }, { key: 'about', to: '/about', icon: Info },
] as const

export function Header({ showSearch = false }: { showSearch?: boolean }) {
  const { t, language, theme, toggleLanguage, toggleTheme } = useUiSettings()
  return (
    <header className="site-header">
      <div className="header-inner">
        <NavLink className="brand" to="/">
          <span className="brand-mark">拾</span>
          <span className="brand-copy">
            <strong>{t('siteName')}</strong>
            <small>{t('siteTagline')}</small>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="主导航">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end={item.to === '/'}>
              <item.icon size={14} strokeWidth={1.4} aria-hidden="true" />{t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions"><button className="language-toggle" onClick={toggleLanguage} aria-label="切换语言">{language === 'zh-CN' ? 'CN' : 'EN'}</button><button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题">{theme === 'light' ? <Moon size={15} strokeWidth={1.5} /> : <Sun size={15} strokeWidth={1.5} />}</button></div>
      </div>
    </header>
  )
}
