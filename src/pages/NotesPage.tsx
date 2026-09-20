import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { BackupButton } from '../components/BackupControls'
import { useAuth } from '../contexts/AuthContext'
import { useUiSettings } from '../contexts/UiSettingsContext'
import { noteCategories } from '../data/notesData'
import { loadCloudNotesPage, NOTES_PAGE_SIZE } from '../services/cloudNotes'
import { cacheNotes, deleteNote, getNotes } from '../services/notesStorage'
import type { NoteCategory, StudyNote } from '../types'

export function NotesPage() {
  const [category, setCategory] = useState<'全部' | NoteCategory>('全部')
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { t } = useUiSettings()
  const { user, syncVersion } = useAuth()
  const [revision, setRevision] = useState(0)
  const [page, setPage] = useState(1)
  const [cloudNotes, setCloudNotes] = useState<StudyNote[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300)
    return () => window.clearTimeout(timer)
  }, [query])
  const effectiveQuery = user ? debouncedQuery : query
  useEffect(() => { setPage(1) }, [category, effectiveQuery, user?.id])
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('learning-notes-change', refresh)
    window.addEventListener('learning-data-sync', refresh)
    return () => { window.removeEventListener('learning-notes-change', refresh); window.removeEventListener('learning-data-sync', refresh) }
  }, [])
  useEffect(() => {
    if (!user) { setCloudNotes([]); setTotal(0); setLoading(false); setLoadError(''); return }
    let active = true
    setLoading(true); setLoadError('')
    void loadCloudNotesPage(user.id, { page, pageSize: NOTES_PAGE_SIZE, category, query: effectiveQuery }).then((result) => {
      if (!active) return
      setCloudNotes(result.notes); setTotal(result.total); cacheNotes(result.notes)
    }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : '云端笔记加载失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, page, category, effectiveQuery, revision, syncVersion])

  const localMatches = useMemo(() => getNotes().filter((note) => (category === '全部' || note.category === category) && (!query || `${note.title} ${note.summary} ${note.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))), [category, query, revision, syncVersion])
  const localTotal = localMatches.length
  const notes = user ? cloudNotes : localMatches.slice((page - 1) * NOTES_PAGE_SIZE, page * NOTES_PAGE_SIZE)
  const noteTotal = user ? total : localTotal
  const pageCount = Math.max(1, Math.ceil(noteTotal / NOTES_PAGE_SIZE))
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`确定删除《${title}》吗？删除后无法恢复。`)) return
    deleteNote(id)
    setCloudNotes((current) => current.filter((note) => note.id !== id))
    setTotal((current) => Math.max(0, current - 1))
    setRevision((value) => value + 1)
  }

  return <main className="page notes-page">
    <div className="notes-heading"><div><p className="eyebrow">KNOWLEDGE ARCHIVE / 02</p><h1>{t('studyNotes')}</h1><p className="page-subtitle">{t('noteSubtitle')}</p></div><div className="notes-heading-actions"><BackupButton /><label className="notes-search"><Search size={14} strokeWidth={1.4} /><input value={query} onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})} placeholder={t('searchNotes')} aria-label={t('searchNotes')} /></label><Link className="primary-text-link" to="/notes/new">＋ {t('addNote')}</Link></div></div>
    <div className="notes-filters"><div className="category-tabs">{noteCategories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><span className="notes-total">共 {noteTotal} 篇</span></div>
    {loadError && <div className="notes-load-error" role="alert"><span>云端笔记加载失败：{loadError}</span><button type="button" onClick={() => setRevision((value) => value + 1)}>重试</button></div>}
    <div className={`notes-list${loading ? ' is-loading' : ''}`}>{notes.length ? notes.map((note, index) => <article className="note-row" key={note.id}><span className="note-index">{String((page - 1) * NOTES_PAGE_SIZE + index + 1).padStart(2, '0')}</span><time>{note.learningDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2 / $3 / $1')}</time><div className="note-row-content"><Link to={`/notes/${note.id}`}><h2>{note.title}</h2></Link><p>{note.summary}</p><div className="note-tags">{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></div><div className="note-row-actions"><Link className="open-note" to={`/notes/${note.id}`}>{t('open')} →</Link><button className="delete-note-button" onClick={() => handleDelete(note.id, note.title)}>删除</button></div></article>) : <div className="notes-empty">{loading ? '正在读取云端笔记…' : '还没有符合条件的学习笔记。'}</div>}</div>
    {pageCount > 1 && <nav className="notes-pagination" aria-label="笔记分页"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><span>第 {page} / {pageCount} 页</span><button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页</button></nav>}
  </main>
}
