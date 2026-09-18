import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { emptyMarkdown, noteCategories } from '../data/notesData'
import { formatDate } from '../data/calendarData'
import { saveNote } from '../services/notesStorage'
import { clearNoteDraft, getNoteDraft, saveNoteDraft } from '../services/noteDraftStorage'
import { getDailyRecord, saveDailyRecord } from '../services/storage'
import { MarkdownContent } from '../components/MarkdownContent'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { NoteCategory, StudyNote } from '../types'

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const NEW_NOTE_DRAFT_ID = 'new'
export function NoteEditorPage() {
  const navigate = useNavigate(); const today = formatDate(new Date())
  const [initialDraft] = useState(() => getNoteDraft(NEW_NOTE_DRAFT_ID))
  const [title, setTitle] = useState(initialDraft?.title ?? ''); const [category, setCategory] = useState<NoteCategory>(initialDraft?.category ?? '开发基础'); const [tags, setTags] = useState(initialDraft?.tags ?? ''); const [learningDate, setLearningDate] = useState(initialDraft?.learningDate ?? today); const [content, setContent] = useState(initialDraft?.content ?? emptyMarkdown)
  const [draftSavedAt, setDraftSavedAt] = useState(initialDraft?.savedAt ?? '')
  const summary = useMemo(() => content.split('\n').find((line) => line.trim() && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('-'))?.trim() ?? '一篇新的学习笔记', [content])
  useEffect(() => {
    const isPristine = !title && category === '开发基础' && !tags && learningDate === today && content === emptyMarkdown
    if (isPristine) return
    const timer = window.setTimeout(() => {
      const draft = saveNoteDraft(NEW_NOTE_DRAFT_ID, { title, category, tags, learningDate, content })
      setDraftSavedAt(draft.savedAt)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [title, category, tags, learningDate, content, today])
  const submit = () => { if (!title.trim()) return; const now = new Date().toISOString(); const note: StudyNote = { id: uid(), title: title.trim(), category, tags: tags.split(/[#,，\s]+/).map((tag) => tag.trim()).filter(Boolean), learningDate, content, summary, createdAt: now, updatedAt: now }; saveNote(note); const daily = getDailyRecord(learningDate); if (!daily.noteIds.includes(note.id)) saveDailyRecord({ ...daily, noteIds: [...daily.noteIds, note.id] }); clearNoteDraft(NEW_NOTE_DRAFT_ID); navigate(`/notes/${note.id}`) }
  const draftStatus = draftSavedAt ? `草稿已自动保存 · ${new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '输入后会自动保存草稿'
  return <main className="page note-editor-page"><div className="editor-top"><div><p className="eyebrow">NEW NOTE / 03</p><h1>新增笔记</h1></div><Link to="/notes">取消</Link></div><div className="note-meta-form"><label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：Docker 从零理解" /></label><label>分类<select value={category} onChange={(event) => setCategory(event.target.value as NoteCategory)}>{noteCategories.filter((item) => item !== '全部').map((item) => <option key={item}>{item}</option>)}</select></label><label>标签<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Docker, 开发基础" /></label><label>学习日期<input type="date" value={learningDate} onChange={(event) => setLearningDate(event.target.value)} /></label></div><div className="markdown-workspace"><MarkdownEditor value={content} onChange={setContent} /><div className="markdown-pane preview-pane"><div className="pane-label">实时预览</div><MarkdownContent content={content} /></div></div><div className="editor-footer"><div><span>支持粘贴 Markdown，也可点击、拖拽或粘贴图片</span><small className="draft-status" role="status">{draftStatus}</small></div><button className="save-note-button" disabled={!title.trim()} onClick={submit}>保存笔记</button></div></main>
}
