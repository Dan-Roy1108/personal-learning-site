import { CALENDAR_RESET_KEY, emptyDailyRecord, STORAGE_KEY } from '../data/calendarData'
import type { DailyRecord, DailyStatus } from '../types'
import { queueRecordSync } from './cloudSync'

type StoredRecords = Record<string, DailyRecord>
const RECORDS_OWNER_KEY = `${STORAGE_KEY}-owner`
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeRecord = (date: string, value: unknown): DailyRecord => {
  const source = isObject(value) ? value : {}
  const status: DailyStatus | undefined = source.status === 'productive' || source.status === 'normal' || source.status === 'low' || source.status === 'rest' ? source.status : undefined
  return { ...emptyDailyRecord(date), ...source, date, plannedTasks: Array.isArray(source.plannedTasks) ? source.plannedTasks : [], completedTasks: Array.isArray(source.completedTasks) ? source.completedTasks : [], noteIds: Array.isArray(source.noteIds) ? source.noteIds.filter((item): item is string => typeof item === 'string') : [], reflection: typeof source.reflection === 'string' ? source.reflection : '', summary: typeof source.summary === 'string' ? source.summary : '', status }
}

const readRaw = (): StoredRecords | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isObject(parsed)) return null
    return Object.fromEntries(Object.entries(parsed).map(([date, value]) => [date, normalizeRecord(date, value)]))
  } catch { return null }
}

const runCalendarResetOnce = () => {
  try {
    if (window.localStorage.getItem(CALENDAR_RESET_KEY) !== 'done') {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.setItem(CALENDAR_RESET_KEY, 'done')
    }
  } catch { /* Keep the page usable when storage is unavailable. */ }
}

export const getDailyRecords = (): StoredRecords => { runCalendarResetOnce(); return readRaw() ?? {} }
export const getDailyRecordsOwner = () => { try { return window.localStorage.getItem(RECORDS_OWNER_KEY) } catch { return null } }
export const setDailyRecordsOwner = (userId: string | null) => { try { if (userId) window.localStorage.setItem(RECORDS_OWNER_KEY, userId); else window.localStorage.removeItem(RECORDS_OWNER_KEY) } catch { /* Keep the calendar usable when storage is unavailable. */ } }
export const getDailyRecord = (date: string): DailyRecord => getDailyRecords()[date] ?? emptyDailyRecord(date)
export const saveDailyRecord = (record: DailyRecord) => {
  const records = getDailyRecords()
  records[record.date] = normalizeRecord(record.date, { ...record, updatedAt: new Date().toISOString() })
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records)) } catch { /* Keep the current view usable if storage is unavailable. */ }
  queueRecordSync(records[record.date])
  return records[record.date]
}
export const updateDailyRecord = (date: string, updates: Partial<DailyRecord>) => saveDailyRecord({ ...getDailyRecord(date), ...updates, date })
export const replaceDailyRecords = (records: StoredRecords) => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records)) } catch { /* Keep the current view usable if storage is unavailable. */ }
}
export const clearCachedDailyRecords = () => { try { window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(RECORDS_OWNER_KEY) } catch { /* Keep sign out usable when storage is unavailable. */ } }

export const removeNoteReferences = (noteId: string) => {
  const records = getDailyRecords()
  let changed = false
  for (const record of Object.values(records)) {
    if (!record.noteIds.includes(noteId)) continue
    record.noteIds = record.noteIds.filter((id) => id !== noteId)
    record.updatedAt = new Date().toISOString()
    changed = true
    queueRecordSync(record)
  }
  if (changed) replaceDailyRecords(records)
}
