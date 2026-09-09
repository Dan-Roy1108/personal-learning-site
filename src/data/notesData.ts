import type { NoteCategory } from '../types'

export const NOTES_STORAGE_KEY = 'learning-notes'
export const noteCategories: Array<'全部' | NoteCategory> = ['全部', 'Agent', '开发基础', '数据库', '数据分析', '求职', '其他']
export const emptyMarkdown = `# 今天学到了什么

在这里记录你的理解。

## 关键概念

- 第一条
- 第二条

> 把复杂的知识，写成自己真正理解的话。`
