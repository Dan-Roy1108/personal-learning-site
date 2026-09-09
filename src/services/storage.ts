import { CALENDAR_RESET_KEY, emptyDailyRecord, STORAGE_KEY } from '../data/calendarData'
import type { DailyRecord, DailyStatus } from '../types'

type StoredRecords = Record<string, DailyRecord>
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
export const getDailyRecord = (date: string): DailyRecord => getDailyRecords()[date] ?? emptyDailyRecord(date)
export const saveDailyRecord = (record: DailyRecord) => {
  const records = getDailyRecords()
  records[record.date] = normalizeRecord(record.date, record)
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records)) } catch { /* Keep the current view usable if storage is unavailable. */ }
  return records[record.date]
}
export const updateDailyRecord = (date: string, updates: Partial<DailyRecord>) => saveDailyRecord({ ...getDailyRecord(date), ...updates, date })
