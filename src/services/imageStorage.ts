const DATABASE_NAME = 'shiguang-learning-images'
const STORE_NAME = 'images'
const DATABASE_VERSION = 1
const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const CLOUD_IMAGE_PREFIX = 'supabase-image://'
export const NOTE_IMAGES_BUCKET = 'note-images'

import { getCloudUserId } from './cloudSession'
import { supabase } from './supabase'

type StoredImage = {
  id: string
  blob: Blob
  mimeType: string
  fileName: string
  createdAt: string
}

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('无法打开本地图片存储'))
})

const createImageId = () => window.crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export const validateImageFile = (file: File) => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('仅支持 PNG、JPG、JPEG、WEBP 和 GIF 图片')
  if (file.size > MAX_IMAGE_SIZE) throw new Error('单张图片不能超过 15MB')
}

export async function uploadImage(file: File): Promise<string> {
  validateImageFile(file)
  const userId = getCloudUserId()
  if (supabase && userId) {
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || file.type.split('/')[1] || 'bin'
    const path = `${userId}/${new Date().toISOString().slice(0, 10)}/${createImageId()}.${extension}`
    const { error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    return `${CLOUD_IMAGE_PREFIX}${encodeURIComponent(path)}`
  }
  const image: StoredImage = { id: createImageId(), blob: file, mimeType: file.type, fileName: file.name || 'pasted-image', createdAt: new Date().toISOString() }
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(image)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('图片保存失败'))
      transaction.onabort = () => reject(transaction.error ?? new Error('图片保存失败'))
    })
  } finally {
    database.close()
  }
  return `local-image://${image.id}`
}

export async function getStoredImage(imageId: string): Promise<Blob | null> {
  if (!/^[a-zA-Z0-9-]+$/.test(imageId)) return null
  const database = await openDatabase()
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(imageId)
      request.onsuccess = () => {
        const image = request.result as StoredImage | undefined
        resolve(image?.blob instanceof Blob && ALLOWED_IMAGE_TYPES.has(image.mimeType) ? image.blob : null)
      }
      request.onerror = () => reject(request.error ?? new Error('图片读取失败'))
    })
  } finally {
    database.close()
  }
}

export const getLocalImageId = (source: string) => /^local-image:\/\/([a-zA-Z0-9-]+)$/.exec(source)?.[1] ?? null
export const getCloudImagePath = (source: string) => {
  if (!source.startsWith(CLOUD_IMAGE_PREFIX)) return null
  try { return decodeURIComponent(source.slice(CLOUD_IMAGE_PREFIX.length)) } catch { return null }
}

export async function getImageBlob(source: string): Promise<Blob | null> {
  const localImageId = getLocalImageId(source)
  if (localImageId) return getStoredImage(localImageId)
  const cloudPath = getCloudImagePath(source)
  if (!cloudPath || !supabase) return null
  const { data, error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).download(cloudPath)
  if (error) throw error
  return data
}

export async function resolveImageSource(source: string): Promise<{ url: string; revoke: boolean } | null> {
  if (/^https?:\/\//i.test(source)) return { url: source, revoke: false }
  const cloudPath = getCloudImagePath(source)
  if (cloudPath && supabase) {
    const { data, error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).createSignedUrl(cloudPath, 3600)
    if (error) throw error
    return { url: data.signedUrl, revoke: false }
  }
  const blob = await getImageBlob(source)
  return blob ? { url: URL.createObjectURL(blob), revoke: true } : null
}

export const getManagedImageSources = (content: string) => {
  const sources = new Set<string>()
  for (const match of content.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) {
    if (getLocalImageId(match[1]) || getCloudImagePath(match[1])) sources.add(match[1])
  }
  return [...sources]
}

export async function deleteCloudImages(sources: string[]) {
  if (!supabase) return
  const paths = sources.map(getCloudImagePath).filter((path): path is string => Boolean(path))
  if (!paths.length) return
  const { error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).remove(paths)
  if (error) throw error
}

export async function migrateLocalImagesToCloud(content: string) {
  const userId = getCloudUserId()
  if (!supabase || !userId) return content
  let migratedContent = content
  const localSources = getManagedImageSources(content).filter((source) => Boolean(getLocalImageId(source)))
  for (const source of localSources) {
    const imageId = getLocalImageId(source)
    if (!imageId) continue
    const blob = await getStoredImage(imageId)
    if (!blob) throw new Error('本地图片已丢失，无法同步到云端')
    const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'bin'
    const path = `${userId}/migrated/${imageId}.${extension}`
    const { error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).upload(path, blob, { contentType: blob.type, upsert: true })
    if (error) throw error
    migratedContent = migratedContent.split(source).join(`${CLOUD_IMAGE_PREFIX}${encodeURIComponent(path)}`)
  }
  return migratedContent
}

export const isSafeImageSource = (source: string) => Boolean(getLocalImageId(source) || getCloudImagePath(source) || /^https?:\/\//i.test(source))
