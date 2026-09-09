import type { CalendarDay } from '../types'

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const statusIcon: Record<NonNullable<CalendarDay['status']>, string> = { productive: '🔥', normal: '●', low: '◌', rest: '—' }

type CalendarProps = {
  days: CalendarDay[]
  onSelect: (day: CalendarDay) => void
}

export function Calendar({ days, onSelect }: CalendarProps) {
  return (
    <section className="calendar-card" aria-label="2026年9月月历">
      <div className="calendar-weekdays">
        {weekdays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {days.map((day, index) => (
          <button key={`${day.iso}-${index}`} onClick={() => onSelect(day)} className={`calendar-day ${!day.inMonth ? 'muted' : ''} ${day.isSelected ? 'selected' : ''} ${day.isToday ? 'is-today' : ''}`}>
            <span className="day-number">{day.date}</span>
            {day.inMonth && day.status && <span className={`day-status status-${day.status}`}>{statusIcon[day.status]} {day.status === 'rest' ? '休息' : ''}</span>}
            {day.studyItems && <span className="day-items">{day.studyItems.slice(0, 3).map((item) => <i key={item.label} className={`topic-dot dot-${item.tone}`} title={item.label} />)}{day.studyItems.length > 3 && <small>+{day.studyItems.length - 3}</small>}</span>}
            {day.inMonth && day.completed !== undefined && <span className="day-progress">✓ {day.completed} / {day.planned}</span>}
            {day.inMonth && day.noteCount !== undefined && <span className="day-notes">▧ {day.noteCount}篇</span>}
          </button>
        ))}
      </div>
      <div className="calendar-legend">
        <span><i className="topic-dot dot-blue" />开发</span>
        <span><i className="topic-dot dot-purple" />Agent</span>
        <span><i className="topic-dot dot-green" />阅读</span>
        <span><i className="topic-dot dot-orange" />求职</span>
      </div>
    </section>
  )
}
