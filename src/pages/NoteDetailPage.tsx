import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MarkdownContent } from '../components/MarkdownContent'
import { useAuth } from '../contexts/AuthContext'
import { loadCloudNote } from '../services/cloudNotes'
import { cacheNotes, deleteNote, getNote } from '../services/notesStorage'
import type { StudyNote } from '../types'

type TocItem = { level: 1 | 2 | 3; text: string; id: string }
const slug = (value: string) => value.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
const getToc = (content: string): TocItem[] => content.split('\n').map((line) => { const match = /^(#{1,3})\s+(.+?)\s*$/.exec(line); return match ? { level: match[1].length as 1 | 2 | 3, text: match[2], id: slug(match[2]) } : null }).filter((item): item is TocItem => Boolean(item))

export function NoteDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user, syncVersion } = useAuth()
  const [tocCollapsed, setTocCollapsed] = useState(false)
  const [note, setNote] = useState<StudyNote | null>(() => getNote(id) ?? null)
  const [loading, setLoading] = useState(Boolean(user && !note))
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    setNote(getNote(id) ?? null)
    if (!user) { setLoading(false); return }
    let active = true
    setLoading(true); setLoadError('')
    void loadCloudNote(user.id, id).then((cloudNote) => {
      if (!active) return
      setNote(cloudNote)
      if (cloudNote) cacheNotes([cloudNote])
    }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : '云端笔记读取失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, user?.id, syncVersion])

  if (loading && !note) return <main className="page placeholder-page"><p className="eyebrow">CLOUD NOTE</p><h1>正在读取笔记…</h1></main>
  if (!note) return <main className="page placeholder-page"><p className="eyebrow">NOTE NOT FOUND</p><h1>找不到这篇笔记</h1>{loadError && <p className="page-subtitle">{loadError}</p>}<Link className="placeholder-link" to="/notes">返回学习笔记 →</Link></main>
  const toc = getToc(note.content)
  const handleDelete = () => {
    if (!window.confirm(`确定删除《${note.title}》吗？删除后无法恢复。`)) return
    deleteNote(note.id)
    navigate('/notes')
  }
  return <main className="page note-detail-page">{loadError && <div className="notes-load-error" role="alert">云端版本读取失败，当前显示本地缓存：{loadError}</div>}<div className="note-detail-actions"><Link className="back-link" to="/notes">← 返回学习笔记</Link><div className="note-detail-action-links"><Link className="edit-note-link" to={`/notes/${note.id}/edit`}>编辑笔记</Link><button className="delete-note-button" onClick={handleDelete}>删除笔记</button></div></div><header className="note-detail-header"><p className="eyebrow">{note.category} / {note.learningDate}</p><h1>{note.title}</h1><p className="note-detail-summary">{note.summary}</p><div className="note-tags">{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></header><div className={`note-reading-layout${tocCollapsed ? ' toc-collapsed' : ''}`}><aside className={`note-toc${tocCollapsed ? ' collapsed' : ''}`}><div className="note-toc-header"><p>本文目录</p><button className="toc-toggle" type="button" aria-label={tocCollapsed ? '展开目录' : '收起目录'} aria-expanded={!tocCollapsed} title={tocCollapsed ? '展开目录' : '收起目录'} onClick={() => setTocCollapsed((value) => !value)}>{tocCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button></div><div className="note-toc-content" aria-hidden={tocCollapsed}>{toc.length ? <nav>{toc.map((item, index) => <a key={`${item.id}-${index}`} className={`toc-level-${item.level}`} href={`#${item.id}`}>{item.text}</a>)}</nav> : <span className="toc-empty">本文暂无目录</span>}</div></aside><article className="note-article"><MarkdownContent content={note.content} /></article></div></main>
}
