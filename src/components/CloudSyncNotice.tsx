import { useSyncExternalStore } from 'react'
import { getCloudSyncStatus, retryCloudSync, subscribeCloudSyncStatus } from '../services/cloudSync'
import { useAuth } from '../contexts/AuthContext'

export function CloudSyncNotice() {
  const { user } = useAuth()
  const status = useSyncExternalStore(subscribeCloudSyncStatus, getCloudSyncStatus, getCloudSyncStatus)
  if (!user || status.state === 'idle' || status.state === 'synced') return null
  return <div className={`data-notice sync-notice ${status.state}`} role={status.state === 'error' ? 'alert' : 'status'}>
    <span>{status.state === 'error' ? `${status.message}。本地内容仍然保留。` : '正在同步到云端…'}</span>
    {status.state === 'error' && <button type="button" onClick={() => { void retryCloudSync() }}>重试同步{status.pendingCount > 1 ? `（${status.pendingCount} 项）` : ''}</button>}
  </div>
}
