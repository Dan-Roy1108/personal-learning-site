import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useUiSettings } from '../contexts/UiSettingsContext'
import { noteCategories } from '../data/notesData'
import { deleteNote, getNotes } from '../services/notesStorage'
import type { NoteCategory } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function NotesPage() {
  const [category, setCategory] = useState<'全部' | NoteCategory>('全部')
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { t } = useUiSettings()
  const { syncVersion } = useAuth()
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('learning-notes-change', refresh)
    return () => window.removeEventListener('learning-notes-change', refresh)
  }, [])
  const notes = useMemo(() => getNotes().filter((note) => (category === '全部' || note.category === category) && (!query || `${note.title} ${note.summary} ${note.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))), [category, query, revision, syncVersion])
  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`确定删除《${title}》吗？删除后无法恢复。`)) return
    deleteNote(id)
  }
  return <main className="page notes-page"><div className="notes-heading"><div><p className="eyebrow">KNOWLEDGE ARCHIVE / 02</p><h1>{t('studyNotes')}</h1><p className="page-subtitle">{t('noteSubtitle')}</p></div><div className="notes-heading-actions"><label className="notes-search"><Search size={14} strokeWidth={1.4} /><input value={query} onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})} placeholder={t('searchNotes')} aria-label={t('searchNotes')} /></label><Link className="primary-text-link" to="/notes/new">＋ {t('addNote')}</Link></div></div><div className="notes-filters"><div className="category-tabs">{noteCategories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div className="notes-list">{notes.length ? notes.map((note, index) => <article className="note-row" key={note.id}><span className="note-index">{String(index + 1).padStart(2, '0')}</span><time>{note.learningDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2 / $3 / $1')}</time><div className="note-row-content"><Link to={`/notes/${note.id}`}><h2>{note.title}</h2></Link><p>{note.summary}</p><div className="note-tags">{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></div><div className="note-row-actions"><Link className="open-note" to={`/notes/${note.id}`}>{t('open')} →</Link><button className="delete-note-button" onClick={() => handleDelete(note.id, note.title)}>删除</button></div></article>) : <div className="notes-empty">还没有符合条件的学习笔记。</div>}</div></main>
}
