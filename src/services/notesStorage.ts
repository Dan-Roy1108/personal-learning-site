import { NOTES_STORAGE_KEY } from '../data/notesData'
import type { StudyNote } from '../types'

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
export const saveNote = (note: StudyNote) => {
  const notes = readNotes()
  const index = notes.findIndex((item) => item.id === note.id)
  if (index >= 0) notes[index] = note
  else notes.push(note)
  try { window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes)) } catch { /* Keep editor usable when storage is unavailable. */ }
  return note
}
