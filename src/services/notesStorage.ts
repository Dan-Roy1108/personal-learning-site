import { NOTES_STORAGE_KEY } from '../data/notesData'
import type { StudyNote } from '../types'
import { queueNoteDelete, queueNoteSync } from './cloudSync'
import { removeNoteReferences } from './storage'

const NOTES_OWNER_KEY = `${NOTES_STORAGE_KEY}-owner`
const MAX_CACHED_NOTES = 100

const readNotes = (): StudyNote[] => {
  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((note): note is StudyNote => Boolean(note && typeof note === 'object' && 'id' in note && 'title' in note)) : []
  } catch { return [] }
}

export const getNotes = () => readNotes().sort((a, b) => b.learningDate.localeCompare(a.learningDate) || b.createdAt.localeCompare(a.createdAt))
export const getNote = (id: string) => readNotes().find((note) => note.id === id)
export const getNotesOwner = () => { try { return window.localStorage.getItem(NOTES_OWNER_KEY) } catch { return null } }
export const setNotesOwner = (userId: string | null) => { try { if (userId) window.localStorage.setItem(NOTES_OWNER_KEY, userId); else window.localStorage.removeItem(NOTES_OWNER_KEY) } catch { /* Keep notes usable when storage is unavailable. */ } }
const trimNotes = (notes: StudyNote[]) => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_CACHED_NOTES)
export const saveNote = (note: StudyNote) => {
  const notes = readNotes()
  const index = notes.findIndex((item) => item.id === note.id)
  if (index >= 0) notes[index] = note
  else notes.push(note)
  try { window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(trimNotes(notes))) } catch { /* Keep editor usable when storage is unavailable. */ }
  queueNoteSync(note)
  return note
}
export const replaceNotes = (notes: StudyNote[]) => {
  try { window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(trimNotes(notes))) } catch { /* Keep the current view usable if storage is unavailable. */ }
}

export const cacheNotes = (notes: StudyNote[]) => {
  const merged = new Map(getNotes().map((note) => [note.id, note]))
  notes.forEach((note) => merged.set(note.id, note))
  replaceNotes([...merged.values()])
}

export const clearCachedNotes = () => { try { window.localStorage.removeItem(NOTES_STORAGE_KEY); window.localStorage.removeItem(NOTES_OWNER_KEY) } catch { /* Keep sign out usable when storage is unavailable. */ } }

export const deleteNote = (id: string) => {
  const notes = readNotes()
  const nextNotes = notes.filter((note) => note.id !== id)
  if (nextNotes.length === notes.length) return false
  try { window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(nextNotes)) } catch { return false }
  removeNoteReferences(id)
  const deletedNote = notes.find((note) => note.id === id)
  if (deletedNote) queueNoteDelete(deletedNote)
  window.dispatchEvent(new Event('learning-notes-change'))
  return true
}
