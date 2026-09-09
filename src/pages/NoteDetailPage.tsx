import { Link, useParams } from 'react-router-dom'
import { getNote } from '../services/notesStorage'
import { MarkdownContent } from '../components/MarkdownContent'

type TocItem = { level: 1 | 2 | 3; text: string; id: string }
const slug = (value: string) => value.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
const getToc = (content: string): TocItem[] => content.split('\n').map((line) => { const match = /^(#{1,3})\s+(.+?)\s*$/.exec(line); return match ? { level: match[1].length as 1 | 2 | 3, text: match[2], id: slug(match[2]) } : null }).filter((item): item is TocItem => Boolean(item))

export function NoteDetailPage() {
  const { id = '' } = useParams()
  const note = getNote(id)
  if (!note) return <main className="page placeholder-page"><p className="eyebrow">NOTE NOT FOUND</p><h1>找不到这篇笔记</h1><Link className="placeholder-link" to="/notes">返回学习笔记 →</Link></main>
  const toc = getToc(note.content)
  return <main className="page note-detail-page"><div className="note-detail-actions"><Link className="back-link" to="/notes">← 返回学习笔记</Link><Link className="edit-note-link" to={`/notes/${note.id}/edit`}>编辑笔记</Link></div><header className="note-detail-header"><p className="eyebrow">{note.category} / {note.learningDate}</p><h1>{note.title}</h1><p className="note-detail-summary">{note.summary}</p><div className="note-tags">{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></header><div className="note-reading-layout"><aside className="note-toc"><p>本文目录</p>{toc.length ? <nav>{toc.map((item, index) => <a key={`${item.id}-${index}`} className={`toc-level-${item.level}`} href={`#${item.id}`}>{item.text}</a>)}</nav> : <span className="toc-empty">本文暂无目录</span>}</aside><article className="note-article"><MarkdownContent content={note.content} /></article></div></main>
}
