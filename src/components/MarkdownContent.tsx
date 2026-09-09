import { useEffect, useState } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { X } from 'lucide-react'
import { getLocalImageId, getStoredImage, isSafeImageSource } from '../services/imageStorage'

type MarkdownImageProps = { source?: string; alt?: string; title?: string; onOpen: (source: string, alt: string) => void }

function MarkdownImage({ source = '', alt = '', title, onOpen }: MarkdownImageProps) {
  const [resolvedSource, setResolvedSource] = useState('')
  useEffect(() => {
    let objectUrl = ''
    let active = true
    const resolveSource = async () => {
      const imageId = getLocalImageId(source)
      if (!imageId) { if (active && /^https?:\/\//i.test(source)) setResolvedSource(source); return }
      try {
        const blob = await getStoredImage(imageId)
        if (active && blob) { objectUrl = URL.createObjectURL(blob); setResolvedSource(objectUrl) }
      } catch { if (active) setResolvedSource('') }
    }
    setResolvedSource('')
    void resolveSource()
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [source])
  if (!isSafeImageSource(source)) return null
  if (!resolvedSource) return <span className="markdown-image-placeholder">图片正在读取…</span>
  return <button type="button" className="markdown-image-button" onClick={() => onOpen(resolvedSource, alt)} aria-label={`放大图片：${alt || '未命名图片'}`}><img src={resolvedSource} alt={alt} title={title} loading="lazy" /></button>
}

export function MarkdownContent({ content }: { content: string }) {
  const [lightbox, setLightbox] = useState<{ source: string; alt: string } | null>(null)
  const slug = (value: string) => value.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
  useEffect(() => {
    if (!lightbox) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setLightbox(null) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [lightbox])
  return <><div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={(url, key, node) => node.tagName === 'img' && isSafeImageSource(url) ? url : defaultUrlTransform(url)} components={{ h1: ({ children }) => <h1 id={slug(String(children))}>{children}</h1>, h2: ({ children }) => <h2 id={slug(String(children))}>{children}</h2>, h3: ({ children }) => <h3 id={slug(String(children))}>{children}</h3>, img: ({ src, alt, title }) => <MarkdownImage source={typeof src === 'string' ? src : ''} alt={alt ?? ''} title={title ?? undefined} onOpen={(source, imageAlt) => setLightbox({ source, alt: imageAlt })} /> }}>{content}</ReactMarkdown></div>{lightbox && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={lightbox.alt || '图片预览'} onMouseDown={(event) => { if (event.target === event.currentTarget) setLightbox(null) }}><button type="button" className="lightbox-close" onClick={() => setLightbox(null)} aria-label="关闭图片预览"><X size={22} /></button><img src={lightbox.source} alt={lightbox.alt} /></div>}</>
}
