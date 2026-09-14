export type StudyTone = 'blue' | 'purple' | 'green' | 'orange'

export type StudyItem = { label: string; tone: StudyTone }
export type DailyStatus = 'productive' | 'normal' | 'low' | 'rest'

export type PlannedTask = {
  id: string
  title: string
  estimatedMinutes?: number
  createdAt: string
}

export type CompletedTask = {
  id: string
  title: string
  actualMinutes?: number
  sourceTaskId?: string
  createdAt: string
}

export type DailyRecord = {
  date: string
  plannedTasks: PlannedTask[]
  completedTasks: CompletedTask[]
  noteIds: string[]
  reflection: string
  summary: string
  status?: DailyStatus
  topics?: StudyItem[]
  updatedAt?: string
}

export type NoteCategory = 'Agent' | '开发基础' | '数据库' | '数据分析' | '求职' | '其他'

export type StudyNote = {
  id: string
  title: string
  category: NoteCategory
  tags: string[]
  learningDate: string
  content: string
  summary: string
  createdAt: string
  updatedAt: string
}

export type CalendarDay = {
  date: number
  iso: string
  inMonth: boolean
  isToday?: boolean
  isSelected?: boolean
  status?: DailyStatus
  studyItems?: StudyItem[]
  completed?: number
  planned?: number
  noteCount?: number
}
