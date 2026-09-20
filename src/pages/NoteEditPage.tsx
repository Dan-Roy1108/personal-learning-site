import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MarkdownContent } from '../components/MarkdownContent'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { useAuth } from '../contexts/AuthContext'
import { loadCloudNote } from '../services/cloudNotes'
import { clearNoteDraft, getNoteDraft, saveNoteDraft } from '../services/noteDraftStorage'
import { cacheNotes, getNote, saveNote } from '../services/notesStorage'
import type { StudyNote } from '../types'

function NoteEditForm({ existing }: { existing: StudyNote }) {
  const navigate = useNavigate()
  const [initialDraft] = useState(() => getNoteDraft(existing.id))
  const restoredDraft = initialDraft && initialDraft.savedAt > existing.updatedAt ? initialDraft : null
  const [title, setTitle] = useState(restoredDraft?.title ?? existing.title)
  const [content, setContent] = useState(restoredDraft?.content ?? existing.content)
  const [draftSavedAt, setDraftSavedAt] = useState(restoredDraft?.savedAt ?? '')
  useEffect(() => {
    if (title === existing.title && content === existing.content) { clearNoteDraft(existing.id); setDraftSavedAt(''); return }
    const timer = window.setTimeout(() => {
      const draft = saveNoteDraft(existing.id, { title, content })
      setDraftSavedAt(draft.savedAt)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [existing.id, existing.title, existing.content, title, content])
  const save = () => {
    const note: StudyNote = { ...existing, title: title.trim() || existing.title, content, summary: content.split('\n').find((line) => line.trim() && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('-'))?.trim() ?? existing.summary, updatedAt: new Date().toISOString() }
    saveNote(note)
    clearNoteDraft(existing.id)
    navigate(`/notes/${note.id}`)
  }
  const draftStatus = draftSavedAt ? `草稿已自动保存 · ${new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '修改后会自动保存草稿'
  return <main className="page note-editor-page"><div className="editor-top"><div><p className="eyebrow">EDIT NOTE / 04</p><h1>编辑笔记</h1></div><Link to={`/notes/${existing.id}`}>取消</Link></div><label className="edit-title-field">标题<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><div className="markdown-workspace"><MarkdownEditor value={content} onChange={setContent} /><div className="markdown-pane preview-pane"><div className="pane-label">实时预览</div><MarkdownContent content={content} /></div></div><div className="editor-footer"><div><span>继续保留原学习日期与标签</span><small className="draft-status" role="status">{draftStatus}</small></div><button className="save-note-button" onClick={save}>保存修改</button></div></main>
}

export function NoteEditPage() {
  const { id = '' } = useParams()
  const { user, syncVersion } = useAuth()
  const [existing, setExisting] = useState<StudyNote | null>(() => getNote(id) ?? null)
  const [loading, setLoading] = useState(Boolean(user && !existing))
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    setExisting(getNote(id) ?? null)
    if (!user) { setLoading(false); return }
    let active = true
    setLoading(true); setLoadError('')
    void loadCloudNote(user.id, id).then((cloudNote) => { if (active) { setExisting(cloudNote); if (cloudNote) cacheNotes([cloudNote]) } }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : '云端笔记读取失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, user?.id, syncVersion])
  if (loading && !existing) return <main className="page placeholder-page"><p className="eyebrow">CLOUD NOTE</p><h1>正在读取笔记…</h1></main>
  if (!existing) return <main className="page placeholder-page"><h1>找不到这篇笔记</h1>{loadError && <p className="page-subtitle">{loadError}</p>}<Link className="placeholder-link" to="/notes">返回学习笔记 →</Link></main>
  return <>{loadError && <div className="notes-load-error" role="alert">云端版本读取失败，当前编辑本地缓存：{loadError}</div>}<NoteEditForm key={`${existing.id}:${existing.updatedAt}`} existing={existing} /></>
}
