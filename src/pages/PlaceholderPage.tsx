import { Link } from 'react-router-dom'
import { useUiSettings } from '../contexts/UiSettingsContext'
import type { TranslationKey } from '../locales/translations'

type PlaceholderPageProps = { page: 'home' | 'growth' | 'about' }

export function PlaceholderPage({ page }: PlaceholderPageProps) {
  const { t } = useUiSettings()
  const copy = (suffix: string) => t(`${page}${suffix}` as TranslationKey)
  return <main className="page placeholder-page"><p className="eyebrow">{copy('Eyebrow')}</p><h1>{copy('Title')}</h1><p className="page-subtitle">{copy('Description')}</p><Link className="placeholder-link" to="/calendar">{copy('Action')}</Link></main>
}
