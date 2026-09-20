import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, FileText, House, Info, Moon, Sun } from 'lucide-react'
import { useUiSettings } from '../contexts/UiSettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { useState, type FormEvent } from 'react'

const navItems = [
  { key: 'home', to: '/', icon: House }, { key: 'calendar', to: '/calendar', icon: CalendarDays }, { key: 'notes', to: '/notes', icon: FileText }, { key: 'growth', to: '/stats', icon: BarChart3 }, { key: 'about', to: '/about', icon: Info },
] as const

const getAuthErrorMessage = (authError: unknown) => {
  const message = authError instanceof Error ? authError.message : ''
  const normalizedMessage = message.toLowerCase()
  if (normalizedMessage.includes('invalid login credentials')) return '邮箱或密码错误；如果还没有同步账号，请先注册。'
  if (normalizedMessage.includes('email not confirmed')) return '邮箱尚未验证，请先点击确认邮件中的链接。'
  if (normalizedMessage.includes('user already registered')) return '该邮箱已经注册，请直接登录。'
  if (normalizedMessage.includes('password should be at least')) return '密码至少需要 6 位。'
  if (normalizedMessage.includes('rate limit')) return '操作过于频繁，请稍后再试。'
  return '操作失败，请检查网络后稍后重试。'
}

export function Header({ showSearch = false }: { showSearch?: boolean }) {
  const { t, language, theme, toggleLanguage, toggleTheme } = useUiSettings()
  const { user, loading, syncing, configured, error, signIn, signUp, signOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [registerMode, setRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setAuthMessage('')
    try {
      if (registerMode) {
        await signUp(email, password)
        setRegisterMode(false)
        setPassword('')
        setAuthMessage('注册邮件已发送。请先完成邮箱验证，再使用新密码登录。')
      } else {
        await signIn(email, password)
        setPassword('')
        setAuthOpen(false)
      }
    } catch (authError) {
      setAuthMessage(getAuthErrorMessage(authError))
    } finally {
      setSubmitting(false)
    }
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
      {authOpen && configured && <div className="auth-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false) }}><div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button type="button" className="auth-close" onClick={() => setAuthOpen(false)} aria-label="关闭">×</button>{user ? <><p className="eyebrow">CLOUD SYNC</p><h2 id="auth-title">你的学习数据</h2><p className="auth-user">{user.email}</p><p className="auth-note">已登录，笔记和日历会自动同步到你的 Supabase 账户。</p><button type="button" className="auth-submit" onClick={() => { void signOut(); setAuthOpen(false) }}>退出登录</button></> : <><p className="eyebrow">CLOUD SYNC</p><h2 id="auth-title">{registerMode ? '创建同步账号' : '登录以同步'}</h2><p className="auth-note">{registerMode ? '请创建本网站专用的同步账号，不要填写 GitHub 密码。' : '请使用你在本网站注册的邮箱和密码登录。'}</p><form className="auth-form" onSubmit={submitAuth}><label htmlFor="auth-email">邮箱<input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus required /></label><label htmlFor="auth-password">密码<input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={registerMode ? 'new-password' : 'current-password'} minLength={6} required /></label><p className="auth-helper">密码至少 6 位；新用户请先注册并完成邮箱验证。</p>{(error || authMessage) && <p className="auth-error" role="status" aria-live="polite">{authMessage || error}</p>}<button type="submit" className="auth-submit" disabled={submitting || !email.trim() || password.length < 6}>{submitting ? '处理中…' : registerMode ? '创建账号' : '登录'}</button><button type="button" className="auth-mode" onClick={() => { setRegisterMode((value) => !value); setPassword(''); setAuthMessage('') }}>{registerMode ? '已有账号？返回登录' : '还没有同步账号？立即注册'}</button></form></>}</div></div>}
    </header>
  )
}
