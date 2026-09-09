const DATABASE_NAME = 'shiguang-learning-images'
const STORE_NAME = 'images'
const DATABASE_VERSION = 1
const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

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
export const isSafeImageSource = (source: string) => Boolean(getLocalImageId(source) || /^https?:\/\//i.test(source))
