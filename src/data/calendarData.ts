import type { DailyRecord } from '../types'

export const STORAGE_KEY = 'learning-daily-records'
export const CALENDAR_RESET_KEY = 'learning-calendar-reset-v1'
export const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const parseDate = (iso: string) => { const [year, month, day] = iso.split('-').map(Number); return new Date(year, month - 1, day) }
export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
export const getTodayIso = () => formatDate(new Date())
export const formatDateLabel = (iso: string) => { const date = parseDate(iso); return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` }
export const weekdayLabel = (iso: string) => ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][parseDate(iso).getDay()]
export const emptyDailyRecord = (date: string): DailyRecord => ({ date, plannedTasks: [], completedTasks: [], noteIds: [], reflection: '', summary: '' })

export const noteTitles: Record<string, string> = {}
