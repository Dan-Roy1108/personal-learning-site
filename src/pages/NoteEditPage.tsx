import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getNote, saveNote } from '../services/notesStorage'
import { clearNoteDraft, getNoteDraft, saveNoteDraft } from '../services/noteDraftStorage'
import { MarkdownContent } from '../components/MarkdownContent'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { StudyNote } from '../types'

export function NoteEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const existing = getNote(id)
  const [initialDraft] = useState(() => getNoteDraft(id))
  const restoredDraft = initialDraft && existing && initialDraft.savedAt > existing.updatedAt ? initialDraft : null
  const [title, setTitle] = useState(restoredDraft?.title ?? existing?.title ?? '')
  const [content, setContent] = useState(restoredDraft?.content ?? existing?.content ?? '')
  const [draftSavedAt, setDraftSavedAt] = useState(restoredDraft?.savedAt ?? '')
  useEffect(() => {
    if (!existing) return
    if (title === existing.title && content === existing.content) { clearNoteDraft(id); setDraftSavedAt(''); return }
    const timer = window.setTimeout(() => {
      const draft = saveNoteDraft(id, { title, content })
      setDraftSavedAt(draft.savedAt)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [id, title, content, existing?.title, existing?.content])
  if (!existing) return <main className="page placeholder-page"><h1>找不到这篇笔记</h1><Link className="placeholder-link" to="/notes">返回学习笔记 →</Link></main>
  const save = () => {
    const note: StudyNote = { ...existing, title: title.trim() || existing.title, content, summary: content.split('\n').find((line) => line.trim() && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('-'))?.trim() ?? existing.summary, updatedAt: new Date().toISOString() }
    saveNote(note)
    clearNoteDraft(id)
    navigate(`/notes/${note.id}`)
  }
  const draftStatus = draftSavedAt ? `草稿已自动保存 · ${new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '修改后会自动保存草稿'
  return <main className="page note-editor-page"><div className="editor-top"><div><p className="eyebrow">EDIT NOTE / 04</p><h1>编辑笔记</h1></div><Link to={`/notes/${existing.id}`}>取消</Link></div><label className="edit-title-field">标题<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><div className="markdown-workspace"><MarkdownEditor value={content} onChange={setContent} /><div className="markdown-pane preview-pane"><div className="pane-label">实时预览</div><MarkdownContent content={content} /></div></div><div className="editor-footer"><div><span>继续保留原学习日期与标签</span><small className="draft-status" role="status">{draftStatus}</small></div><button className="save-note-button" onClick={save}>保存修改</button></div></main>
}
