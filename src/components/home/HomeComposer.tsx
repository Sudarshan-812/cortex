'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Loader2, Paperclip, Sparkles } from 'lucide-react'
import { createChatSession } from '@/app/session-actions'

/**
 * The "ask" bar on Home. Submitting creates a fresh chat session and hands off
 * to the full chat view at /chat/[id]?q=… which auto-sends the question.
 */
export function HomeComposer({
  workspaceId,
  suggestions = [],
}: {
  workspaceId: string
  suggestions?: string[]
}) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [starting, setStarting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadNote, setUploadNote] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  async function startChat(query: string) {
    if (!query.trim() || starting) return
    setStarting(true)
    const result = await createChatSession(workspaceId)
    if (result.session) {
      router.push(`/chat/${result.session.id}?q=${encodeURIComponent(query.trim())}`)
    } else {
      setStarting(false)
    }
  }

  function handleSubmit() {
    startChat(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    if (e.key === 'Enter' && !e.shiftKey && !touch) { e.preventDefault(); handleSubmit() }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadNote(`Uploading ${file.name}…`)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('workspaceId', workspaceId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const reader = res.body?.getReader()
      if (reader) { while (!(await reader.read()).done) { /* drain to completion */ } }
      setUploadNote(`${file.name} indexed`)
      router.refresh()
    } catch {
      setUploadNote('Upload failed. Try again.')
    } finally {
      setUploading(false)
      if (uploadRef.current) uploadRef.current.value = ''
      setTimeout(() => setUploadNote(null), 4000)
    }
  }

  return (
    <div className="w-full">
      <div
        className="flex items-end gap-2 rounded-xl border px-3 py-2.5 transition-colors focus-within:border-[var(--cx-line-2)]"
        style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)' }}
      >
        <input ref={uploadRef} type="file" className="hidden" accept=".pdf,.docx,.xlsx" onChange={handleUpload} />
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          disabled={uploading}
          aria-label="Upload a document"
          className="size-8 shrink-0 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--cx-paper-2)] disabled:opacity-50"
          style={{ color: 'var(--cx-mute-2)' }}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--cx-accent)' }} /> : <Paperclip size={15} />}
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask anything about your documents…"
          className="flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-[var(--cx-mute-2)]"
          style={{ color: 'var(--cx-ink)', maxHeight: 180 }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input.trim() || starting}
          aria-label="Send"
          className="cx-btn-ink size-8 shrink-0 rounded-md flex items-center justify-center disabled:opacity-40"
        >
          {starting ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
        </button>
      </div>

      {uploadNote && (
        <p className="mt-2 text-center text-[12px]" style={{ color: 'var(--cx-mute-1)' }}>{uploadNote}</p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => startChat(s)}
              disabled={starting}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors hover:bg-[var(--cx-paper-2)] disabled:opacity-50"
              style={{ borderColor: 'var(--cx-line)', color: 'var(--cx-mute-1)' }}
            >
              <Sparkles size={11} style={{ color: 'var(--cx-accent)', opacity: 0.7 }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
