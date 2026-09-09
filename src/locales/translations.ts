export const translations = {
  'zh-CN': {
    home: '首页', calendar: '日历', notes: '笔记', growth: '成长', about: '关于', today: '今天',
    learningCalendar: '学习日历', calendarSubtitle: '记录每一次努力，见证更好的自己。', dailyDetails: '当天详情', selectStatus: '选择状态',
    plannedList: '今日 List', plannedHint: '今天原本打算做什么', noPlans: '今天还没有计划', addTask: '添加任务', plannedCount: '原计划',
    completed: '真正完成', completedHint: '今天实际上完成了什么', noCompleted: '今天还没有完成记录', addCompleted: '添加完成事项', completedCount: '已完成',
    studyNotes: '学习笔记', noNotes: '今天还没有关联学习笔记', viewAll: '查看全部', open: '打开',
    reflection: '今日复盘', noReflection: '今天还没有复盘记录', summary: '今日总结', noSummary: '今天还没有总结记录',
    edit: '编辑', save: '保存', cancel: '取消', items: '项', searchNotes: '搜索笔记', addNote: '新增笔记', noteSubtitle: '把理解留下来。',
    productive: '高效', normal: '正常', low: '低效', rest: '休息', siteName: '拾光', siteTagline: '让学习成为一种生活方式',
    homeEyebrow: '拾光自习', homeTitle: '让学习成为一种生活方式', homeDescription: '首页将在下一阶段展开。先从今天的学习日历开始，记录每一次努力。', homeAction: '前往今天的学习日历 →',
    growthEyebrow: '成长', growthTitle: '你的成长轨迹', growthDescription: '成长洞察将在后续版本开放。现在先持续学习，让轨迹慢慢成形。', growthAction: '前往学习日历 →',
    aboutEyebrow: '关于', aboutTitle: '持续学习，持续成长', aboutDescription: '关于页面将在后续版本开放。在此之前，让学习手账替你讲述这段旅程。', aboutAction: '前往学习日历 →',
  },
  en: {
    home: 'Home', calendar: 'Calendar', notes: 'Notes', growth: 'Growth', about: 'About', today: 'Today',
    learningCalendar: 'Learning Calendar', calendarSubtitle: 'Record every effort and witness a better self.', dailyDetails: 'Daily Details', selectStatus: 'Select status',
    plannedList: 'Today List', plannedHint: 'What did you plan to do today?', noPlans: 'No plans yet today', addTask: 'Add task', plannedCount: 'Planned',
    completed: 'Actually Done', completedHint: 'What did you actually finish today?', noCompleted: 'Nothing completed yet today', addCompleted: 'Add completed item', completedCount: 'Completed',
    studyNotes: 'Study Notes', noNotes: 'No study notes linked today', viewAll: 'View all', open: 'Open',
    reflection: 'Daily Reflection', noReflection: 'No reflection yet today', summary: 'Daily Summary', noSummary: 'No summary yet today',
    edit: 'Edit', save: 'Save', cancel: 'Cancel', items: 'items', searchNotes: 'Search notes', addNote: 'New note', noteSubtitle: 'Leave your understanding behind.',
    productive: 'Productive', normal: 'Normal', low: 'Low', rest: 'Rest', siteName: 'Shiguang', siteTagline: 'Make learning a way of life',
    homeEyebrow: 'Shiguang', homeTitle: 'Make Learning a Way of Life', homeDescription: 'The home page will unfold in the next phase. For now, begin with today’s learning journal and record every effort.', homeAction: 'Go to Today’s Journal →',
    growthEyebrow: 'Growth', growthTitle: 'Your Growth Journey', growthDescription: 'Growth insights will be available in a later version. For now, keep learning and let the journey take shape.', growthAction: 'Go to the Journal →',
    aboutEyebrow: 'About', aboutTitle: 'Keep Learning, Keep Becoming', aboutDescription: 'The about page will open in a later version. Until then, let the journal speak for the journey.', aboutAction: 'Go to the Journal →',
  },
} as const

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations['zh-CN']
