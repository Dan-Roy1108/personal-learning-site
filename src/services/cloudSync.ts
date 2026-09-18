import type { DailyRecord, StudyNote } from '../types'
import { getDailyRecords, replaceDailyRecords } from './storage'
import { getNotes, replaceNotes } from './notesStorage'
import { supabase } from './supabase'

let currentUserId: string | null = null
let recordSyncTimer: ReturnType<typeof setTimeout> | null = null
let noteSyncTimer: ReturnType<typeof setTimeout> | null = null
const noteDeleteTimers = new Map<string, ReturnType<typeof setTimeout>>()

export const setCloudUser = (userId: string | null) => { currentUserId = userId }
export const getCloudUser = () => currentUserId

const recordUpdatedAt = (record: DailyRecord) => record.updatedAt ?? ''
const noteUpdatedAt = (note: StudyNote) => note.updatedAt ?? note.createdAt

export async function syncUserData(userId: string) {
  if (!supabase) return
  const [remoteRecordsResult, remoteNotesResult] = await Promise.all([
    supabase.from('daily_records').select('date,data,updated_at').eq('user_id', userId),
    supabase.from('study_notes').select('id,data,updated_at').eq('user_id', userId),
  ])
  if (remoteRecordsResult.error) throw remoteRecordsResult.error
  if (remoteNotesResult.error) throw remoteNotesResult.error

  const localRecords = getDailyRecords()
  const localNotes = getNotes()
  const remoteRecords = (remoteRecordsResult.data ?? []).map((row) => ({ date: row.date as string, data: row.data as DailyRecord, updatedAt: row.updated_at as string | undefined }))
  const remoteNotes = (remoteNotesResult.data ?? []).map((row) => ({ id: row.id as string, data: row.data as StudyNote, updatedAt: row.updated_at as string | undefined }))

  if (!remoteRecords.length && !remoteNotes.length) {
    await Promise.all([upsertRecords(userId, Object.values(localRecords)), upsertNotes(userId, localNotes)])
    return
  }

  const mergedRecords: Record<string, DailyRecord> = { ...localRecords }
  for (const remote of remoteRecords) {
    const local = mergedRecords[remote.date]
    const remoteRecord = { ...remote.data, date: remote.date, updatedAt: remote.updatedAt ?? remote.data.updatedAt }
    if (!local || recordUpdatedAt(remoteRecord) >= recordUpdatedAt(local)) mergedRecords[remote.date] = remoteRecord
  }
  const mergedNotes = new Map(localNotes.map((note) => [note.id, note]))
  for (const remote of remoteNotes) {
    const remoteNote = { ...remote.data, id: remote.id, updatedAt: remote.updatedAt ?? remote.data.updatedAt }
    const local = mergedNotes.get(remote.id)
    if (!local || noteUpdatedAt(remoteNote) >= noteUpdatedAt(local)) mergedNotes.set(remote.id, remoteNote)
  }
  replaceDailyRecords(mergedRecords)
  replaceNotes([...mergedNotes.values()])
  await Promise.all([upsertRecords(userId, Object.values(mergedRecords)), upsertNotes(userId, [...mergedNotes.values()])])
  window.dispatchEvent(new Event('learning-data-sync'))
}

const upsertRecords = async (userId: string, records: DailyRecord[]) => {
  if (!supabase || !records.length) return
  const rows = records.map((record) => ({ user_id: userId, date: record.date, data: record, updated_at: record.updatedAt ?? new Date().toISOString() }))
  const { error } = await supabase.from('daily_records').upsert(rows, { onConflict: 'user_id,date' })
  if (error) throw error
}

const upsertNotes = async (userId: string, notes: StudyNote[]) => {
  if (!supabase || !notes.length) return
  const rows = notes.map((note) => ({ user_id: userId, id: note.id, data: note, updated_at: note.updatedAt ?? note.createdAt }))
  const { error } = await supabase.from('study_notes').upsert(rows, { onConflict: 'user_id,id' })
  if (error) throw error
}

export const queueRecordSync = (record: DailyRecord) => {
  if (!currentUserId || !supabase) return
  const userId = currentUserId
  if (recordSyncTimer) clearTimeout(recordSyncTimer)
  recordSyncTimer = setTimeout(() => {
    void upsertRecords(userId, [record]).catch((error) => console.error('同步日历失败', error))
  }, 250)
}

export const queueNoteSync = (note: StudyNote) => {
  if (!currentUserId || !supabase) return
  const userId = currentUserId
  if (noteSyncTimer) clearTimeout(noteSyncTimer)
  noteSyncTimer = setTimeout(() => {
    void upsertNotes(userId, [note]).catch((error) => console.error('同步笔记失败', error))
  }, 250)
}

export const queueNoteDelete = (noteId: string) => {
  if (!currentUserId || !supabase) return
  const userId = currentUserId
  const existingTimer = noteDeleteTimers.get(noteId)
  if (existingTimer) clearTimeout(existingTimer)
  noteDeleteTimers.set(noteId, setTimeout(async () => {
    noteDeleteTimers.delete(noteId)
    const { error } = await supabase!.from('study_notes').delete().eq('user_id', userId).eq('id', noteId)
    if (error) console.error('删除云端笔记失败', error)
  }, 250))
}
