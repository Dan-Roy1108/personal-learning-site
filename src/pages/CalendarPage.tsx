import { useEffect, useMemo, useState } from 'react'
import { Calendar } from '../components/Calendar'
import { DailyPanel } from '../components/DailyPanel'
import { emptyDailyRecord, formatDate, getTodayIso, parseDate, startOfMonth } from '../data/calendarData'
import { getDailyRecords, saveDailyRecord } from '../services/storage'
import { getNotes } from '../services/notesStorage'
import type { CalendarDay, DailyRecord } from '../types'
import { useUiSettings } from '../contexts/UiSettingsContext'
import { useAuth } from '../contexts/AuthContext'

const buildCalendarDays = (month: Date, records: Record<string, DailyRecord>, selectedDate: string, today: string): CalendarDay[] => {
  const first = startOfMonth(month)
  const start = new Date(first); start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start); date.setDate(start.getDate() + index)
    const iso = formatDate(date); const record = records[iso]
    const hasTaskSummary = Boolean(record && (record.plannedTasks.length || record.completedTasks.length))
    const noteCount = getNotes().filter((note) => note.learningDate === iso).length
    const hasCompleted = Boolean(record?.completedTasks.length)
    const hasPlanned = Boolean(record?.plannedTasks.length)
    return { date: date.getDate(), iso, inMonth: date.getMonth() === month.getMonth(), isToday: iso === today, isSelected: iso === selectedDate, status: record?.status, studyItems: record?.topics?.length ? record.topics : undefined, completed: hasCompleted ? record?.completedTasks.length : undefined, planned: hasPlanned ? record?.plannedTasks.length : undefined, noteCount: noteCount || undefined }
  })
}

export function CalendarPage() {
  const { t } = useUiSettings()
  const { syncVersion } = useAuth()
  const today = getTodayIso()
  const [records, setRecords] = useState<Record<string, DailyRecord>>(() => getDailyRecords())
  const [selectedDate, setSelectedDate] = useState(today)
  const [month, setMonth] = useState(() => startOfMonth(parseDate(selectedDate)))
  useEffect(() => { setRecords(getDailyRecords()) }, [syncVersion])
  const selectedRecord = records[selectedDate] ?? emptyDailyRecord(selectedDate)
  const days = useMemo(() => buildCalendarDays(month, records, selectedDate, today), [month, records, selectedDate, today])
  const updateSelected = (updates: Partial<DailyRecord>) => {
    const next = saveDailyRecord({ ...selectedRecord, ...updates, date: selectedDate })
    setRecords((current) => ({ ...current, [selectedDate]: next }))
  }
  const selectDay = (day: CalendarDay) => {
    setSelectedDate(day.iso)
    if (!day.inMonth) setMonth(startOfMonth(parseDate(day.iso)))
  }
  const changeMonth = (offset: number) => { const next = new Date(month.getFullYear(), month.getMonth() + offset, 1); setMonth(next); setSelectedDate(formatDate(next)) }
  const goToday = () => { setMonth(startOfMonth(parseDate(today))); setSelectedDate(today) }

  return <main className="page calendar-page">
    <div className="page-intro"><div><p className="eyebrow">LEARNING JOURNAL / 01</p><h1>{t('learningCalendar')}</h1><p className="page-subtitle">{t('calendarSubtitle')}</p></div><div className="intro-rule" aria-hidden="true"><span>PLAN</span><span>DO</span><span>REFLECT</span></div></div>
    <div className="calendar-toolbar"><div className="month-switcher"><button aria-label="上个月" onClick={() => changeMonth(-1)}>←</button><h2>{month.getFullYear()}年 {month.getMonth() + 1}月</h2><button aria-label="下个月" onClick={() => changeMonth(1)}>→</button></div><button className="today-button" onClick={goToday}>{t('today')}</button></div>
    <div className="calendar-layout"><div className="calendar-column"><Calendar days={days} onSelect={selectDay} /></div><DailyPanel record={selectedRecord} onChange={updateSelected} /></div>
  </main>
}
