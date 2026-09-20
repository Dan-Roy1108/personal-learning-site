import type { DailyRecord, StudyNote } from '../types'
import { loadAllCloudNotes } from './cloudNotes'
import { getImageBlob, getManagedImageSources } from './imageStorage'
import { getNotes, getNotesOwner } from './notesStorage'
import { getDailyRecords, getDailyRecordsOwner } from './storage'
import { supabase } from './supabase'

const BACKUP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000
const BACKUP_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
const backupKey = (userId: string | null) => `shiguang-backup:last:${userId ?? 'guest'}`
const snoozeKey = (userId: string | null) => `shiguang-backup:snooze:${userId ?? 'guest'}`

const readTimestamp = (key: string) => { try { return Number(window.localStorage.getItem(key) ?? 0) || 0 } catch { return 0 } }

export const isBackupDue = (userId: string | null) => {
  const now = Date.now()
  return now - readTimestamp(backupKey(userId)) >= BACKUP_INTERVAL_MS && now >= readTimestamp(snoozeKey(userId))
}

export const snoozeBackupReminder = (userId: string | null) => {
  try { window.localStorage.setItem(snoozeKey(userId), String(Date.now() + BACKUP_SNOOZE_MS)) } catch { /* Keep reminders non-blocking. */ }
}

export const getLastBackupAt = (userId: string | null) => readTimestamp(backupKey(userId))

async function loadAllCloudRecords(userId: string): Promise<Record<string, DailyRecord>> {
  if (!supabase) return {}
  const records: Record<string, DailyRecord> = {}
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('daily_records').select('date,data,updated_at').eq('user_id', userId).order('date', { ascending: true }).range(from, from + pageSize - 1)
    if (error) throw error
    for (const row of data ?? []) records[row.date as string] = { ...(row.data as DailyRecord), date: row.date as string, updatedAt: row.updated_at as string }
    if ((data ?? []).length < pageSize) break
  }
  return records
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error ?? new Error('图片备份读取失败'))
  reader.readAsDataURL(blob)
})

const downloadJson = (value: unknown, fileName: string) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const mergeNotes = (cloudNotes: StudyNote[], localNotes: StudyNote[]) => {
  const merged = new Map(cloudNotes.map((note) => [note.id, note]))
  for (const note of localNotes) {
    const cloudNote = merged.get(note.id)
    if (!cloudNote || note.updatedAt >= cloudNote.updatedAt) merged.set(note.id, note)
  }
  return [...merged.values()].sort((left, right) => right.learningDate.localeCompare(left.learningDate) || right.createdAt.localeCompare(left.createdAt))
}

const mergeRecords = (cloudRecords: Record<string, DailyRecord>, localRecords: Record<string, DailyRecord>) => {
  const merged = { ...cloudRecords }
  for (const [date, record] of Object.entries(localRecords)) {
    const cloudRecord = merged[date]
    if (!cloudRecord || (record.updatedAt ?? '') >= (cloudRecord.updatedAt ?? '')) merged[date] = record
  }
  return merged
}

export async function exportLearningBackup(userId: string | null, onProgress?: (message: string) => void) {
  onProgress?.('正在读取笔记和日历…')
  let notes = getNotes()
  let dailyRecords = getDailyRecords()
  if (userId && supabase) {
    const [cloudNotes, cloudRecords] = await Promise.all([loadAllCloudNotes(userId), loadAllCloudRecords(userId)])
    const localNotes = !getNotesOwner() || getNotesOwner() === userId ? notes : []
    const localRecords = !getDailyRecordsOwner() || getDailyRecordsOwner() === userId ? dailyRecords : {}
    notes = mergeNotes(cloudNotes, localNotes)
    dailyRecords = mergeRecords(cloudRecords, localRecords)
  }
  const imageSources = [...new Set(notes.flatMap((note) => getManagedImageSources(note.content)))]
  const images: Record<string, { mimeType: string; dataUrl: string }> = {}
  for (let index = 0; index < imageSources.length; index += 1) {
    onProgress?.(`正在备份图片 ${index + 1}/${imageSources.length}…`)
    const blob = await getImageBlob(imageSources[index])
    if (blob) images[imageSources[index]] = { mimeType: blob.type, dataUrl: await blobToDataUrl(blob) }
  }
  const exportedAt = new Date().toISOString()
  downloadJson({ format: 'shiguang-learning-backup', version: 2, exportedAt, notes, dailyRecords, images }, `shiguang-backup-${exportedAt.slice(0, 10)}.json`)
  try { window.localStorage.setItem(backupKey(userId), String(Date.now())); window.localStorage.removeItem(snoozeKey(userId)) } catch { /* Download already succeeded. */ }
  onProgress?.('备份已导出')
  return { noteCount: notes.length, recordCount: Object.keys(dailyRecords).length, imageCount: Object.keys(images).length }
}
