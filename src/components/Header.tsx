import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, FileText, House, Info, Moon, Sun } from 'lucide-react'
import { useUiSettings } from '../contexts/UiSettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

const navItems = [
  { key: 'home', to: '/', icon: House }, { key: 'calendar', to: '/calendar', icon: CalendarDays }, { key: 'notes', to: '/notes', icon: FileText }, { key: 'growth', to: '/stats', icon: BarChart3 }, { key: 'about', to: '/about', icon: Info },
] as const

export function Header({ showSearch = false }: { showSearch?: boolean }) {
  const { t, language, theme, toggleLanguage, toggleTheme } = useUiSettings()
  const { user, loading, syncing, configured, error, signIn, signUp, signOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [registerMode, setRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const submitAuth = async () => {
    try { setAuthMessage(''); if (registerMode) { await signUp(email, password); setAuthMessage('注册成功，请检查邮箱后登录。') } else { await signIn(email, password); setAuthOpen(false) } } catch (authError) { setAuthMessage(authError instanceof Error ? authError.message : '操作失败，请重试') }
  }
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

        <div className="header-actions"><button className="language-toggle" onClick={toggleLanguage} aria-label="切换语言">{language === 'zh-CN' ? 'CN' : 'EN'}</button><button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题">{theme === 'light' ? <Moon size={15} strokeWidth={1.5} /> : <Sun size={15} strokeWidth={1.5} />}</button>{configured && !loading && <button className="auth-toggle" onClick={() => setAuthOpen(true)}>{user ? (syncing ? '同步中…' : '已登录') : '登录同步'}</button>}</div>
      </div>
      {authOpen && configured && <div className="auth-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false) }}><div className="auth-dialog"><button className="auth-close" onClick={() => setAuthOpen(false)} aria-label="关闭">×</button>{user ? <><p className="eyebrow">CLOUD SYNC</p><h2>你的学习数据</h2><p className="auth-user">{user.email}</p><p className="auth-note">已登录，笔记和日历会自动同步到你的 Supabase 账户。</p><button className="auth-submit" onClick={() => { void signOut(); setAuthOpen(false) }}>退出登录</button></> : <><p className="eyebrow">CLOUD SYNC</p><h2>{registerMode ? '创建同步账号' : '登录以同步'}</h2><p className="auth-note">在不同电脑登录同一账号，即可继续使用你的学习记录。</p><label>邮箱<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={registerMode ? 'new-password' : 'current-password'} /></label>{(error || authMessage) && <p className="auth-error">{authMessage || error}</p>}<button className="auth-submit" disabled={!email || password.length < 6} onClick={() => void submitAuth()}>{registerMode ? '注册' : '登录'}</button><button className="auth-mode" onClick={() => { setRegisterMode((value) => !value); setAuthMessage('') }}>{registerMode ? '已有账号？返回登录' : '还没有账号？注册'}</button></>}</div></div>}
    </header>
  )
}
