import { useEffect, useState } from 'react'
import { formatDateLabel, noteTitles, weekdayLabel } from '../data/calendarData'
import { deleteNote, getNotes } from '../services/notesStorage'
import type { CompletedTask, DailyRecord, DailyStatus, PlannedTask } from '../types'
import { useUiSettings } from '../contexts/UiSettingsContext'

type DailyPanelProps = { record: DailyRecord; onChange: (updates: Partial<DailyRecord>) => void }
const statusLabels: Record<DailyStatus, string> = { productive: '高效', normal: '正常', low: '低效', rest: '休息' }
const statusEmoji: Record<DailyStatus, string> = { productive: '🔥', normal: '🙂', low: '😵', rest: '🏖' }
const formatMinutes = (minutes?: number) => !minutes ? '' : `${Number((minutes / 60).toFixed(2)).toString()}h`
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function InlineEditor({ initial, placeholder, onSave, onCancel }: { initial: string; placeholder: string; onSave: (value: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial)
  return <div className="inline-editor"><textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} autoFocus /><div className="editor-actions"><button onClick={() => onSave(value)}>保存</button><button onClick={onCancel}>取消</button></div></div>
}

function TaskEditor({ kind, initialTitle = '', initialMinutes = '', onSave, onCancel }: { kind: 'planned' | 'completed'; initialTitle?: string; initialMinutes?: string; onSave: (title: string, minutes?: number) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initialTitle)
  const [minutes, setMinutes] = useState(initialMinutes)
  return <div className="task-editor"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === 'planned' ? '计划什么？' : '实际完成了什么？'} autoFocus /><input value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="预计时长（小时）" inputMode="decimal" /><div className="editor-actions"><button disabled={!title.trim()} onClick={() => onSave(title.trim(), minutes ? Math.round(Number(minutes) * 60) : undefined)}>保存</button><button onClick={onCancel}>取消</button></div></div>
}

export function DailyPanel({ record, onChange }: DailyPanelProps) {
  const { t } = useUiSettings()
  const [, setNotesRevision] = useState(0)
  const linkedNotes = getNotes().filter((note) => note.learningDate === record.date)
  const [editing, setEditing] = useState<'reflection' | 'summary' | null>(null)
  const [taskEditor, setTaskEditor] = useState<{ kind: 'planned' | 'completed'; id?: string; title?: string; minutes?: number } | null>(null)
  const [completeSource, setCompleteSource] = useState<PlannedTask | null>(null)
  const [completeMinutes, setCompleteMinutes] = useState('')
  const [pendingCheckId, setPendingCheckId] = useState<string | null>(null)
  useEffect(() => { setEditing(null); setTaskEditor(null); setCompleteSource(null); setCompleteMinutes(''); setPendingCheckId(null) }, [record.date])
  useEffect(() => {
    const refreshNotes = () => setNotesRevision((value) => value + 1)
    window.addEventListener('learning-notes-change', refreshNotes)
    return () => window.removeEventListener('learning-notes-change', refreshNotes)
  }, [])
  const editPlanned = (task: PlannedTask) => setTaskEditor({ kind: 'planned', id: task.id, title: task.title, minutes: task.estimatedMinutes })
  const editCompleted = (task: CompletedTask) => setTaskEditor({ kind: 'completed', id: task.id, title: task.title, minutes: task.actualMinutes })
  const saveTask = (title: string, minutes?: number) => {
    if (!taskEditor) return
    if (taskEditor.kind === 'planned') onChange({ plannedTasks: record.plannedTasks.map((task) => task.id === taskEditor.id ? { ...task, title, estimatedMinutes: minutes } : task) })
    else onChange({ completedTasks: record.completedTasks.map((task) => task.id === taskEditor.id ? { ...task, title, actualMinutes: minutes } : task) })
    setTaskEditor(null)
  }
  const addTask = (kind: 'planned' | 'completed') => setTaskEditor({ kind })
  const saveNewTask = (title: string, minutes?: number) => {
    if (!taskEditor) return
    const createdAt = new Date().toISOString()
    if (taskEditor.kind === 'planned') onChange({ plannedTasks: [...record.plannedTasks, { id: uid(), title, estimatedMinutes: minutes, createdAt }] })
    else onChange({ completedTasks: [...record.completedTasks, { id: uid(), title, actualMinutes: minutes, createdAt }] })
    setTaskEditor(null)
  }
  const removePlanned = (id: string) => onChange({ plannedTasks: record.plannedTasks.filter((task) => task.id !== id), completedTasks: record.completedTasks.map((task) => task.sourceTaskId === id ? { ...task, sourceTaskId: undefined } : task) })
  const removeCompleted = (id: string) => onChange({ completedTasks: record.completedTasks.filter((task) => task.id !== id) })
  const confirmComplete = () => {
    if (!completeSource) return
    const existing = record.completedTasks.some((task) => task.sourceTaskId === completeSource.id)
    if (!existing) onChange({ completedTasks: [...record.completedTasks, { id: uid(), title: completeSource.title, actualMinutes: completeMinutes ? Math.round(Number(completeMinutes) * 60) : undefined, sourceTaskId: completeSource.id, createdAt: new Date().toISOString() }] })
    setCompleteSource(null); setCompleteMinutes(''); setPendingCheckId(null)
  }
  const togglePlannedCompletion = (task: PlannedTask) => {
    const linked = record.completedTasks.find((item) => item.sourceTaskId === task.id)
    if (linked) { onChange({ completedTasks: record.completedTasks.filter((item) => item.id !== linked.id) }); return }
    setPendingCheckId(task.id); setCompleteSource(task)
  }

  return <aside className="daily-panel" aria-label="当天详情">
    <div className="daily-heading"><div><p className="overline">{t('dailyDetails')}</p><h2>{formatDateLabel(record.date)}</h2><p className="weekday">{weekdayLabel(record.date)}</p></div><div className="status-control">{record.status && <span className={`mood mood-${record.status}`}>{statusEmoji[record.status]} {t(record.status)}</span>}<select aria-label={t('selectStatus')} value={record.status ?? ''} onChange={(event) => onChange({ status: event.target.value ? event.target.value as DailyStatus : undefined })}><option value="">{t('selectStatus')}</option>{Object.keys(statusLabels).map((value) => <option key={value} value={value}>{statusEmoji[value as DailyStatus]} {t(value as DailyStatus)}</option>)}</select></div></div>
    <div className="detail-sections">
      <section className="detail-section"><div className="section-title-row"><h3>{t('plannedList')}</h3><span className="section-count">{t('plannedCount')} {record.plannedTasks.length} {t('items')}</span></div><p className="section-note">{t('plannedHint')}</p><ul className="task-list planned-list">{record.plannedTasks.length ? record.plannedTasks.map((task) => { const transferred = record.completedTasks.some((item) => item.sourceTaskId === task.id); return <li key={task.id}><button aria-label={transferred || pendingCheckId === task.id ? `取消完成 ${task.title}` : `完成 ${task.title}`} className={`task-check ${transferred || pendingCheckId === task.id ? 'checked' : ''}`} onClick={() => togglePlannedCompletion(task)}>{transferred || pendingCheckId === task.id ? '✓' : ''}</button><button className="task-text" onClick={() => editPlanned(task)}>{task.title}</button><time>{formatMinutes(task.estimatedMinutes)}</time><button className="task-action complete-action" onClick={() => togglePlannedCompletion(task)}>{transferred ? '已记录' : '完成'}</button><button className="task-action" onClick={() => editPlanned(task)}>{t('edit')}</button><button className="task-action danger" onClick={() => removePlanned(task.id)}>删除</button></li> }) : <li className="empty-state">{t('noPlans')}</li>}</ul><button className="add-button" onClick={() => addTask('planned')}>＋ {t('addTask')}</button></section>
      <section className="detail-section"><div className="section-title-row"><h3>{t('completed')}</h3><span className="section-count strong">{t('completedCount')} {record.completedTasks.length} {t('items')}</span></div><p className="section-note">{t('completedHint')}</p><ul className="task-list completed-list">{record.completedTasks.length ? record.completedTasks.map((task) => <li key={task.id}><span className="completed-check">✓</span><button className="task-text" onClick={() => editCompleted(task)}>{task.title}</button><time>{formatMinutes(task.actualMinutes)}</time><button className="task-action" onClick={() => editCompleted(task)}>{t('edit')}</button><button className="task-action danger" onClick={() => removeCompleted(task.id)}>删除</button></li>) : <li className="empty-state">{t('noCompleted')}</li>}</ul><button className="add-button" onClick={() => addTask('completed')}>＋ {t('addCompleted')}</button></section>
      <section className="detail-section compact-section"><div className="section-title-row"><h3>{t('studyNotes')}</h3><a href="/notes">{t('viewAll')} →</a></div>{linkedNotes.length ? <ul className="note-links">{linkedNotes.slice(0, 3).map((note) => <li key={note.id}><a href={`/notes/${note.id}`}><span className="note-link-copy"><strong>{note.title}</strong><small>{note.summary || '把今天的理解留下来'}</small><em>{note.tags.map((tag) => `#${tag}`).join(' ') || '#学习记录'}</em></span><span>{t('open')} →</span></a><button className="note-delete-action" onClick={() => { if (window.confirm(`确定删除《${note.title}》吗？删除后无法恢复。`)) deleteNote(note.id) }}>删除</button></li>)}</ul> : <p className="empty-state">{t('noNotes')}</p>}</section>
      <section className="detail-section text-section"><div className="section-title-row"><h3>{t('reflection')}</h3>{editing !== 'reflection' && <button onClick={() => setEditing('reflection')}>{t('edit')}</button>}</div>{editing === 'reflection' ? <InlineEditor initial={record.reflection} placeholder="今天整体状态怎么样？\n今天做得好的地方是什么？\n有哪些事情没有做好？为什么？\n明天需要调整什么？" onSave={(value) => { onChange({ reflection: value }); setEditing(null) }} onCancel={() => setEditing(null)} /> : <p className={!record.reflection ? 'empty-state' : ''}>{record.reflection || t('noReflection')}</p>}</section>
      <section className="detail-section text-section summary-section"><div className="section-title-row"><h3>{t('summary')}</h3>{editing !== 'summary' && <button onClick={() => setEditing('summary')}>{t('edit')}</button>}</div>{editing === 'summary' ? <InlineEditor initial={record.summary} placeholder="今天最重要的结论是什么？" onSave={(value) => { onChange({ summary: value }); setEditing(null) }} onCancel={() => setEditing(null)} /> : <p className={!record.summary ? 'empty-state' : ''}>{record.summary || t('noSummary')}</p>}</section>
    </div>
    {taskEditor && <div className="editor-overlay"><TaskEditor kind={taskEditor.kind} initialTitle={taskEditor.title} initialMinutes={taskEditor.minutes ? String(Number((taskEditor.minutes / 60).toFixed(2))) : ''} onSave={taskEditor.id ? saveTask : saveNewTask} onCancel={() => setTaskEditor(null)} /></div>}
    {completeSource && <div className="editor-overlay"><div className="completion-dialog"><h4>记录实际完成时长</h4><p>{completeSource.title}</p><label className="hours-field">实际完成时长：<input value={completeMinutes} onChange={(event) => setCompleteMinutes(event.target.value)} placeholder="1.5" inputMode="decimal" autoFocus /> 小时</label><div className="editor-actions"><button onClick={confirmComplete}>确认完成</button><button onClick={() => { setCompleteSource(null); setPendingCheckId(null) }}>取消</button></div></div></div>}
  </aside>
}
