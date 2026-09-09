import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { uploadImage } from '../services/imageStorage'

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  uploadImageHandler?: (file: File) => Promise<string>
}

const imageAlt = (file: File) => (file.name || '粘贴图片').replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '').trim() || '图片'

export function MarkdownEditor({ value, onChange, uploadImageHandler = uploadImage }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const insertImages = async (files: File[]) => {
    if (!files.length || isUploading) return
    const textarea = textareaRef.current
    const selectionStart = textarea?.selectionStart ?? value.length
    const selectionEnd = textarea?.selectionEnd ?? selectionStart
    setIsUploading(true)
    setError('')
    try {
      const markdownLines: string[] = []
      for (const file of files) markdownLines.push(`![${imageAlt(file)}](${await uploadImageHandler(file)})`)
      const insertion = markdownLines.join('\n\n')
      const prefix = selectionStart > 0 && value[selectionStart - 1] !== '\n' ? '\n\n' : ''
      const suffix = selectionEnd < value.length && value[selectionEnd] !== '\n' ? '\n\n' : '\n'
      const insertedText = `${prefix}${insertion}${suffix}`
      onChange(`${value.slice(0, selectionStart)}${insertedText}${value.slice(selectionEnd)}`)
      window.requestAnimationFrame(() => {
        const nextPosition = selectionStart + insertedText.length
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(nextPosition, nextPosition)
      })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '图片处理失败，请重试')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items).filter((item) => item.kind === 'file' && item.type.startsWith('image/')).map((item) => item.getAsFile()).filter((file): file is File => Boolean(file))
    if (files.length) { event.preventDefault(); void insertImages(files) }
  }

  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
    if (files.length) void insertImages(files)
  }

  return <div className={`markdown-pane markdown-editor-pane ${isDragging ? 'is-dragging' : ''}`}>
    <div className="pane-label editor-pane-label"><span>MARKDOWN 编辑</span><button type="button" className="insert-image-button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}><ImagePlus size={14} strokeWidth={1.5} />{isUploading ? '正在保存…' : '插入图片'}</button><input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(event) => void insertImages(Array.from(event.target.files ?? []))} /></div>
    <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} onPaste={onPaste} onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} spellCheck={false} aria-label="Markdown 编辑" />
    {isDragging && <div className="image-drop-hint">松开以插入图片</div>}
    {error && <p className="image-upload-error" role="alert">{error}</p>}
  </div>
}
