import type { NoteCategory, StudyNote } from '../types'
import { supabase } from './supabase'

export const NOTES_PAGE_SIZE = 20

type NoteRow = {
  id: string
  data: StudyNote
  updated_at?: string | null
  deleted_at?: string | null
}

export type CloudNotesPage = {
  notes: StudyNote[]
  total: number
  page: number
  pageSize: number
}

const normalizeNote = (row: NoteRow): StudyNote => ({
  ...row.data,
  id: row.id,
  updatedAt: row.updated_at ?? row.data.updatedAt,
})

const searchText = (note: StudyNote) => `${note.title} ${note.summary} ${note.tags.join(' ')}`.toLowerCase()

export const noteToRow = (userId: string, note: StudyNote) => ({
  user_id: userId,
  id: note.id,
  data: note,
  title: note.title,
  summary: note.summary,
  category: note.category,
  learning_date: note.learningDate,
  created_at: note.createdAt,
  search_text: searchText(note),
  updated_at: note.updatedAt ?? note.createdAt,
  deleted_at: null,
})

const searchPattern = (value: string) => `%${value.trim().toLowerCase().replace(/[\\%_]/g, '\\$&')}%`

export async function loadCloudNotesPage(userId: string, options: { page?: number; pageSize?: number; category?: '全部' | NoteCategory; query?: string } = {}): Promise<CloudNotesPage> {
  if (!supabase) return { notes: [], total: 0, page: 1, pageSize: options.pageSize ?? NOTES_PAGE_SIZE }
  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, options.pageSize ?? NOTES_PAGE_SIZE))
  const from = (page - 1) * pageSize
  let request = supabase.from('study_notes').select('id,data,updated_at,deleted_at', { count: 'exact' }).eq('user_id', userId).is('deleted_at', null)
  if (options.category && options.category !== '全部') request = request.eq('category', options.category)
  if (options.query?.trim()) request = request.ilike('search_text', searchPattern(options.query))
  const { data, count, error } = await request.order('learning_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).range(from, from + pageSize - 1)
  if (error) throw error
  return { notes: ((data ?? []) as NoteRow[]).map(normalizeNote), total: count ?? 0, page, pageSize }
}

export async function loadCloudNote(userId: string, noteId: string): Promise<StudyNote | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('study_notes').select('id,data,updated_at,deleted_at').eq('user_id', userId).eq('id', noteId).is('deleted_at', null).maybeSingle()
  if (error) throw error
  return data ? normalizeNote(data as NoteRow) : null
}

export async function loadCloudNotesForDate(userId: string, learningDate: string, limit = 3): Promise<StudyNote[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('study_notes').select('id,data,updated_at,deleted_at').eq('user_id', userId).eq('learning_date', learningDate).is('deleted_at', null).order('created_at', { ascending: false, nullsFirst: false }).limit(limit)
  if (error) throw error
  return ((data ?? []) as NoteRow[]).map(normalizeNote)
}

export async function loadCloudNoteStates(userId: string, noteIds: string[]): Promise<Map<string, NoteRow>> {
  if (!supabase || !noteIds.length) return new Map()
  const rows: NoteRow[] = []
  for (let index = 0; index < noteIds.length; index += 200) {
    const { data, error } = await supabase.from('study_notes').select('id,data,updated_at,deleted_at').eq('user_id', userId).in('id', noteIds.slice(index, index + 200))
    if (error) throw error
    rows.push(...((data ?? []) as NoteRow[]))
  }
  return new Map(rows.map((row) => [row.id, row]))
}

export async function loadAllCloudNotes(userId: string): Promise<StudyNote[]> {
  if (!supabase) return []
  const notes: StudyNote[] = []
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('study_notes').select('id,data,updated_at,deleted_at').eq('user_id', userId).is('deleted_at', null).order('learning_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).range(from, from + pageSize - 1)
    if (error) throw error
    const rows = (data ?? []) as NoteRow[]
    notes.push(...rows.map(normalizeNote))
    if (rows.length < pageSize) break
  }
  return notes
}

export const rowToNote = normalizeNote
