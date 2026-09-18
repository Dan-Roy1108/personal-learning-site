import type { NoteCategory } from '../types'

export type NoteDraft = {
  title: string
  content: string
  category?: NoteCategory
  tags?: string
  learningDate?: string
  savedAt: string
}

const DRAFT_STORAGE_PREFIX = 'shiguang-note-draft:'
const noteCategories: NoteCategory[] = ['Agent', '开发基础', '数据库', '数据分析', '求职', '其他']
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const storageKey = (draftId: string) => `${DRAFT_STORAGE_PREFIX}${draftId}`

export const getNoteDraft = (draftId: string): NoteDraft | null => {
  try {
    const raw = window.localStorage.getItem(storageKey(draftId))
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!isObject(value) || typeof value.title !== 'string' || typeof value.content !== 'string' || typeof value.savedAt !== 'string') return null
    return {
      title: value.title,
      content: value.content,
      category: noteCategories.includes(value.category as NoteCategory) ? value.category as NoteCategory : undefined,
      tags: typeof value.tags === 'string' ? value.tags : undefined,
      learningDate: typeof value.learningDate === 'string' ? value.learningDate : undefined,
      savedAt: value.savedAt,
    }
  } catch {
    return null
  }
}

export const saveNoteDraft = (draftId: string, draft: Omit<NoteDraft, 'savedAt'>) => {
  const savedDraft: NoteDraft = { ...draft, savedAt: new Date().toISOString() }
  try { window.localStorage.setItem(storageKey(draftId), JSON.stringify(savedDraft)) } catch { /* Keep editing usable when storage is unavailable. */ }
  return savedDraft
}

export const clearNoteDraft = (draftId: string) => {
  try { window.localStorage.removeItem(storageKey(draftId)) } catch { /* Keep navigation usable when storage is unavailable. */ }
}
