import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { exportLearningBackup, getLastBackupAt, isBackupDue, snoozeBackupReminder } from '../services/backupService'

function useBackupExport() {
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const exportBackup = async () => {
    if (exporting) return false
    setExporting(true); setMessage('正在准备备份…')
    try {
      const result = await exportLearningBackup(user?.id ?? null, setMessage)
      setMessage(`已导出 ${result.noteCount} 篇笔记、${result.imageCount} 张图片`)
      return true
    } catch (error) {
      setMessage(error instanceof Error ? `导出失败：${error.message}` : '导出失败，请稍后重试')
      return false
    } finally { setExporting(false) }
  }
  return { userId: user?.id ?? null, exporting, message, exportBackup }
}

export function BackupButton() {
  const { exporting, message, exportBackup } = useBackupExport()
  return <div className="backup-button-wrap"><button type="button" className="backup-button" disabled={exporting} onClick={() => { void exportBackup() }}><Download size={14} aria-hidden="true" />{exporting ? '正在导出…' : '导出备份'}</button>{message && <small role="status">{message}</small>}</div>
}

export function BackupReminder() {
  const { userId, exporting, message, exportBackup } = useBackupExport()
  const [due, setDue] = useState(() => isBackupDue(userId))
  useEffect(() => { setDue(isBackupDue(userId)) }, [userId])
  if (!userId || !due) return null
  const lastBackupAt = getLastBackupAt(userId)
  return <div className="data-notice backup-notice" role="status"><span>{lastBackupAt ? '距离上次备份已超过 30 天，建议现在导出一次。' : '建议导出第一份学习数据备份，之后每 30 天提醒一次。'}{message ? ` ${message}` : ''}</span><div><button type="button" disabled={exporting} onClick={() => { void exportBackup().then((succeeded) => { if (succeeded) setDue(false) }) }}>{exporting ? '正在导出…' : '立即导出'}</button><button type="button" onClick={() => { snoozeBackupReminder(userId); setDue(false) }}>7 天后提醒</button></div></div>
}
