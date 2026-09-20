import type { DailyRecord, StudyNote } from '../types'
import { loadCloudNoteStates, noteToRow, rowToNote } from './cloudNotes'
import { getCloudUserId, setCloudUserId } from './cloudSession'
import { deleteCloudImages, getManagedImageSources, migrateLocalImagesToCloud } from './imageStorage'
import { getNotes, getNotesOwner, replaceNotes, setNotesOwner } from './notesStorage'
import { getDailyRecords, getDailyRecordsOwner, replaceDailyRecords, setDailyRecordsOwner } from './storage'
import { supabase } from './supabase'

export type CloudSyncStatus = {
  state: 'idle' | 'syncing' | 'synced' | 'error'
  message: string
  pendingCount: number
  updatedAt: string
}

const recordSyncTimers = new Map<string, ReturnType<typeof setTimeout>>()
const noteSyncTimers = new Map<string, ReturnType<typeof setTimeout>>()
const failedOperations = new Map<string, { label: string; message: string; operation: () => Promise<void> }>()
const activeOperations = new Set<string>()
const statusListeners = new Set<() => void>()
let syncStatus: CloudSyncStatus = { state: 'idle', message: '', pendingCount: 0, updatedAt: '' }
let syncGeneration = 0

const errorMessage = (error: unknown) => error instanceof Error ? error.message : '网络异常，请稍后重试'
const updateStatus = (updates: Partial<CloudSyncStatus>) => {
  syncStatus = { ...syncStatus, ...updates, pendingCount: failedOperations.size, updatedAt: new Date().toISOString() }
  statusListeners.forEach((listener) => listener())
}

export const subscribeCloudSyncStatus = (listener: () => void) => { statusListeners.add(listener); return () => statusListeners.delete(listener) }
export const getCloudSyncStatus = () => syncStatus
export const getCloudUser = getCloudUserId
export const setCloudUser = (userId: string | null) => {
  if (getCloudUserId() === userId) return
  syncGeneration += 1
  recordSyncTimers.forEach((timer) => clearTimeout(timer))
  noteSyncTimers.forEach((timer) => clearTimeout(timer))
  recordSyncTimers.clear()
  noteSyncTimers.clear()
  failedOperations.clear()
  activeOperations.clear()
  setCloudUserId(userId)
  updateStatus({ state: 'idle', message: '' })
}

async function runOperation(key: string, label: string, operation: () => Promise<void>, rethrow = false) {
  const generation = syncGeneration
  activeOperations.add(key)
  updateStatus({ state: 'syncing', message: label })
  try {
    await operation()
    if (generation !== syncGeneration) return
    activeOperations.delete(key)
    failedOperations.delete(key)
    const remainingFailure = failedOperations.values().next().value as { message: string } | undefined
    updateStatus({ state: activeOperations.size ? 'syncing' : failedOperations.size ? 'error' : 'synced', message: activeOperations.size ? '正在同步到云端' : remainingFailure?.message ?? '云端同步完成' })
  } catch (error) {
    if (generation !== syncGeneration) return
    activeOperations.delete(key)
    const message = `${label}失败：${errorMessage(error)}`
    failedOperations.set(key, { label, message, operation })
    updateStatus({ state: 'error', message })
    if (rethrow) throw error
  }
}

export async function retryCloudSync() {
  const pending = [...failedOperations.entries()]
  if (!pending.length) return
  for (const [key, task] of pending) await runOperation(key, task.label, task.operation)
}

const recordUpdatedAt = (record: DailyRecord) => record.updatedAt ?? ''
const noteUpdatedAt = (note: StudyNote) => note.updatedAt ?? note.createdAt

const upsertRecords = async (userId: string, records: DailyRecord[]) => {
  if (!supabase || !records.length) return
  const rows = records.map((record) => ({ user_id: userId, date: record.date, data: record, updated_at: record.updatedAt ?? new Date().toISOString() }))
  const { error } = await supabase.from('daily_records').upsert(rows, { onConflict: 'user_id,date' })
  if (error) throw error
}

export const upsertNotes = async (userId: string, notes: StudyNote[]) => {
  if (!supabase || !notes.length) return
  const cloudReadyNotes = await Promise.all(notes.map(async (note) => {
    const content = await migrateLocalImagesToCloud(note.content)
    return content === note.content ? note : { ...note, content }
  }))
  const { error } = await supabase.from('study_notes').upsert(cloudReadyNotes.map((note) => noteToRow(userId, note)), { onConflict: 'user_id,id' })
  if (error) throw error
  if (cloudReadyNotes.some((note, index) => note !== notes[index])) {
    const merged = new Map(getNotes().map((note) => [note.id, note]))
    cloudReadyNotes.forEach((note) => merged.set(note.id, note))
    replaceNotes([...merged.values()])
    window.dispatchEvent(new Event('learning-notes-change'))
  }
}

async function syncUserDataCore(userId: string) {
  if (!supabase) return
  const remoteRecordsResult = await supabase.from('daily_records').select('date,data,updated_at').eq('user_id', userId)
  if (remoteRecordsResult.error) throw remoteRecordsResult.error

  const recordsOwner = getDailyRecordsOwner()
  const localRecords = recordsOwner && recordsOwner !== userId ? {} : getDailyRecords()
  const remoteRecords = (remoteRecordsResult.data ?? []).map((row) => ({ date: row.date as string, data: row.data as DailyRecord, updatedAt: row.updated_at as string | undefined }))
  const mergedRecords: Record<string, DailyRecord> = { ...localRecords }
  for (const remote of remoteRecords) {
    const local = mergedRecords[remote.date]
    const remoteRecord = { ...remote.data, date: remote.date, updatedAt: remote.updatedAt ?? remote.data.updatedAt }
    if (!local || recordUpdatedAt(remoteRecord) >= recordUpdatedAt(local)) mergedRecords[remote.date] = remoteRecord
  }
  replaceDailyRecords(mergedRecords)
  setDailyRecordsOwner(userId)

  const owner = getNotesOwner()
  const localNotes = owner && owner !== userId ? [] : getNotes()
  const remoteStates = await loadCloudNoteStates(userId, localNotes.map((note) => note.id))
  const cachedNotes: StudyNote[] = []
  const notesToUpload: StudyNote[] = []
  for (const localNote of localNotes) {
    const remote = remoteStates.get(localNote.id)
    if (remote?.deleted_at && remote.deleted_at >= noteUpdatedAt(localNote)) continue
    if (remote && remote.updated_at && remote.updated_at >= noteUpdatedAt(localNote)) cachedNotes.push(rowToNote(remote))
    else { cachedNotes.push(localNote); notesToUpload.push(localNote) }
  }
  replaceNotes(cachedNotes)
  setNotesOwner(userId)
  await Promise.all([upsertRecords(userId, Object.values(mergedRecords)), upsertNotes(userId, notesToUpload)])
  window.dispatchEvent(new Event('learning-data-sync'))
}

export const syncUserData = async (userId: string) => runOperation(`initial:${userId}`, '登录数据同步', () => syncUserDataCore(userId), true)

export const queueRecordSync = (record: DailyRecord) => {
  const userId = getCloudUserId()
  if (!userId || !supabase) return
  const existingTimer = recordSyncTimers.get(record.date)
  if (existingTimer) clearTimeout(existingTimer)
  recordSyncTimers.set(record.date, setTimeout(() => {
    recordSyncTimers.delete(record.date)
    void runOperation(`record:${record.date}`, '日历同步', () => upsertRecords(userId, [record]))
  }, 250))
}

export const queueNoteSync = (note: StudyNote) => {
  const userId = getCloudUserId()
  if (!userId || !supabase) return
  const existingTimer = noteSyncTimers.get(note.id)
  if (existingTimer) clearTimeout(existingTimer)
  noteSyncTimers.set(note.id, setTimeout(() => {
    noteSyncTimers.delete(note.id)
    void runOperation(`note:${note.id}`, '笔记同步', () => upsertNotes(userId, [note]))
  }, 250))
}

export const queueNoteDelete = (note: StudyNote) => {
  const userId = getCloudUserId()
  if (!userId || !supabase) return
  const client = supabase
  const pendingSave = noteSyncTimers.get(note.id)
  if (pendingSave) { clearTimeout(pendingSave); noteSyncTimers.delete(note.id) }
  void runOperation(`delete:${note.id}`, '删除云端笔记', async () => {
    const deletedAt = new Date().toISOString()
    const { error } = await client.from('study_notes').update({ deleted_at: deletedAt, updated_at: deletedAt }).eq('user_id', userId).eq('id', note.id)
    if (error) throw error
    await deleteCloudImages(getManagedImageSources(note.content))
  })
}
