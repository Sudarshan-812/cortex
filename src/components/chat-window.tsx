'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import {
  FileText, ArrowUp, Plus, Square, HardDrive,
  ChevronDown, Sparkles, CheckCircle2, UploadCloud, Copy, Check, Database, ExternalLink, Download, RotateCcw,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DynamicGreeting } from '@/components/DynamicGreeting'
import { DocumentReaderPanel } from '@/components/DocumentReaderPanel'
import { ChatTopBar } from '@/components/ChatTopBar'
import { buildSuggestedPrompts } from '@/lib/prompts'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/* ── Types ──────────────────────────────────────────────────────── */
type Source = {
  chunk_id: string
  document_id: string | null
  document_name: string
  content: string
  similarity: number
  drive_url?: string | null
}
type ToolEvent = { name: string; status: 'running' | 'done'; count?: number }
type Message   = { id?: string; role: 'user' | 'assistant'; content: string; sources?: Source[]; created_at?: string; answered_from?: 'documents' | 'web' | 'both' | 'none'; error?: string }

function exportConversation(messages: Message[], workspaceName?: string) {
  const date = new Date().toISOString().slice(0, 10)
  const lines: string[] = [
    `# Cortex Conversation Export`,
    `**Workspace:** ${workspaceName ?? 'Unknown'}`,
    `**Exported:** ${date}`,
    `---`,
    '',
  ]
  for (const msg of messages) {
    if (!msg.content) continue
    if (msg.role === 'user') {
      lines.push(`## You`)
      lines.push(msg.content)
    } else {
      lines.push(`## Cortex`)
      lines.push(msg.content)
      if (msg.sources && msg.sources.length > 0) {
        lines.push('')
        lines.push(`**Sources:**`)
        for (const src of msg.sources) {
          lines.push(`- ${src.document_name} (${src.similarity}% relevance)`)
        }
      }
    }
    lines.push('')
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `cortex-export-${date}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/* ── Streaming text - per-chunk blur reveal ─────────────────────── */
function StreamingContent({ content }: { content: string }) {
  const [chunks, setChunks] = useState<string[]>(content ? [content] : [])
  const lenRef = useRef(content.length)

  useEffect(() => {
    if (content.length > lenRef.current) {
      setChunks(c => [...c, content.slice(lenRef.current)])
    } else if (content.length < lenRef.current) {
      setChunks(content ? [content] : [])
    }
    lenRef.current = content.length
  }, [content])

  return (
    <span
      className="whitespace-pre-wrap break-words text-[15px] leading-[1.7]"
      style={{ color: 'var(--cx-ink-2)' }}
    >
      {chunks.map((chunk, i) => (
        <span key={i} className="cx-token">{chunk}</span>
      ))}
    </span>
  )
}

/* ── Thinking indicator - one calm pulse ────────────────────────── */
function ThinkingOrb({ tools }: { tools: ToolEvent[] }) {
  const reduce  = useReducedMotion()
  const running = tools.find(t => t.status === 'running')
  const done    = tools.filter(t => t.status === 'done')
  const isDone  = !running && done.length > 0

  const label = running
    ? (running.name === 'search_documents' ? 'Searching documents…' : 'Searching the web…')
    : done.length > 0
      ? `Found ${done.at(-1)?.count ?? 0} sources`
      : 'Thinking…'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-3 py-1"
    >
      <div className="relative flex-shrink-0 size-5 flex items-center justify-center">
        {isDone ? (
          <CheckCircle2 size={18} style={{ color: 'var(--cx-ok)' }} />
        ) : (
          <motion.div
            className="size-2.5 rounded-full"
            style={{ background: 'var(--cx-accent)' }}
            animate={reduce ? undefined : { opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      <motion.span
        key={label}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="text-[13px] font-medium block"
        style={{ color: 'var(--cx-mute-1)' }}
      >
        {label}
      </motion.span>
    </motion.div>
  )
}

/* ── Source citations ───────────────────────────────────────────── */
function RelevanceBar({ score }: { score: number }) {
  return (
    <div
      className="h-[3px] rounded-full overflow-hidden flex-shrink-0"
      style={{ background: 'var(--cx-line)', width: 36 }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'var(--cx-ok)' }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
      />
    </div>
  )
}

function SourceCitations({ sources, onViewChunk }: { sources: Source[]; onViewChunk: (id: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-4"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors"
        style={{ color: open ? 'var(--cx-accent)' : 'var(--cx-mute-1)' }}
      >
        <FileText size={11} />
        {sources.length} source{sources.length !== 1 ? 's' : ''}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2.5 space-y-2">
              {sources.map((src, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 p-2.5 rounded-md border cursor-default transition-colors"
                  style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--cx-surface)')}
                >
                  <div
                    className="size-7 rounded-md flex items-center justify-center flex-shrink-0 border"
                    style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)' }}
                  >
                    <FileText size={12} style={{ color: 'var(--cx-mute-1)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-[12.5px] font-semibold truncate flex-1" style={{ color: 'var(--cx-ink)' }}>
                        {src.document_name}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <RelevanceBar score={src.similarity} />
                        <span className="text-[10.5px] cx-num" style={{ color: 'var(--cx-ok)' }}>
                          {src.similarity}%
                        </span>
                      </div>
                    </div>
                    <p
                      className="text-[12px] leading-relaxed line-clamp-2 italic cx-serif"
                      style={{ color: 'var(--cx-mute-1)' }}
                    >
                      &ldquo;{src.content}&rdquo;
                    </p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); onViewChunk(src.chunk_id) }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors duration-150"
                        style={{ color: 'var(--cx-mute-2)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-mute-2)')}
                      >
                        <ExternalLink size={10} />
                        View passage
                      </button>
                      {src.drive_url && (
                        <a
                          href={src.drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors duration-150"
                          style={{ color: 'var(--cx-mute-2)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-accent)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-mute-2)')}
                        >
                          <HardDrive size={10} />
                          Open in Drive
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Answer grounding badge ─────────────────────────────────────── */
function AnsweredFromBadge({ kind }: { kind: NonNullable<Message['answered_from']> }) {
  const map = {
    documents: { label: 'Grounded in your documents', ok: true },
    web:       { label: 'Grounded in your documents', ok: true },
    both:      { label: 'Grounded in your documents', ok: true },
    none:      { label: 'Not found in your documents', ok: false },
  } as const
  const { label, ok } = map[kind]
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 border-transparent text-[11px] font-medium',
        ok ? 'bg-[var(--cx-ok-wash)] text-[var(--cx-ok)]' : 'bg-[var(--cx-paper-2)] text-[var(--cx-mute-1)]'
      )}
    >
      <span className="cx-dot" style={{ background: ok ? 'var(--cx-ok)' : 'var(--cx-mute-2)' }} />
      {label}
    </Badge>
  )
}

/* ── Assistant message actions (copy / regenerate) ─────────────── */
function MsgActions({ content, onRegenerate }: { content: string; onRegenerate: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => {
          navigator.clipboard.writeText(content)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        }}
        aria-label={copied ? 'Copied' : 'Copy answer'}
        className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--cx-paper-2)]"
        style={{ color: copied ? 'var(--cx-ok)' : 'var(--cx-mute-2)' }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <button
        onClick={onRegenerate}
        aria-label="Regenerate answer"
        className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--cx-paper-2)]"
        style={{ color: 'var(--cx-mute-2)' }}
      >
        <RotateCcw size={13} />
      </button>
    </div>
  )
}

/* ── Code block with copy button ────────────────────────────────── */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--cx-line)' }}>
      <div
        className="px-4 py-1.5 border-b flex items-center justify-between"
        style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)' }}
      >
        {lang ? (
          <span className="cx-rule-label">{lang}</span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] font-mono transition-colors duration-150"
          style={{ color: copied ? 'var(--cx-ok)' : 'var(--cx-mute-2)' }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="text-[13px] leading-relaxed p-4 overflow-x-auto font-mono" style={{ background: 'var(--cx-ink)', color: '#a5d6a7' }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ── Prompt card ───────────────────────────────────────────────── */
function PromptCard({
  label, index, onClick,
}: { label: string; index: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="cx-prompt-card text-left px-4 py-3.5 rounded-2xl border text-[13px] font-medium"
    >
      <Sparkles size={11} className="mb-2" style={{ color: 'var(--cx-accent)', opacity: 0.65 }} />
      <span style={{ color: 'inherit' }}>{label}</span>
    </motion.button>
  )
}

/* ── Markdown renderer (react-markdown + gfm; clickable [chunk_id] citations) ── */
const CITE = /\[([0-9a-fA-F][0-9a-fA-F-]{7,})\]/g

function Markdown({ content, onCite }: { content: string; onCite?: (id: string) => void }) {
  // Turn [<id>] tokens into links the `a` renderer picks up as citation chips.
  const src = content.replace(CITE, (_m, id) => `[[${id}]](#cite-${id})`)
  return (
    <div className="text-[15px] leading-[1.7]" style={{ color: 'var(--cx-ink-2)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: p => <h1 className="text-xl font-semibold tracking-tight mt-5 mb-2" style={{ color: 'var(--cx-ink)' }} {...p} />,
          h2: p => <h2 className="text-[17px] font-semibold tracking-tight mt-4 mb-1.5" style={{ color: 'var(--cx-ink)' }} {...p} />,
          h3: p => <h3 className="text-[15px] font-semibold mt-3 mb-1" style={{ color: 'var(--cx-ink-2)' }} {...p} />,
          p:  p => <p className="my-2 leading-[1.7]" {...p} />,
          ul: p => <ul className="my-2 pl-5 space-y-1.5 list-disc marker:text-[var(--cx-mute-2)]" {...p} />,
          ol: p => <ol className="my-2 pl-5 space-y-1.5 list-decimal marker:text-[var(--cx-accent)] marker:font-semibold" {...p} />,
          li: p => <li className="leading-relaxed" {...p} />,
          hr: () => <hr className="my-4" style={{ borderColor: 'var(--cx-line)' }} />,
          strong: p => <strong className="font-semibold" style={{ color: 'var(--cx-ink)' }} {...p} />,
          em: p => <em className="cx-serif italic" style={{ color: 'var(--cx-mute-1)' }} {...p} />,
          blockquote: p => <blockquote className="my-3 pl-4 border-l-2 cx-serif italic" style={{ borderColor: 'var(--cx-accent-line)', color: 'var(--cx-mute-1)' }} {...p} />,
          a: ({ href, children, ...rest }) => {
            if (href?.startsWith('#cite-')) {
              const id = href.slice(6)
              return (
                <Badge
                  asChild
                  variant="outline"
                  className="h-4 min-w-4 mx-px px-1 align-baseline rounded-md border-[var(--cx-accent-line)] bg-[var(--cx-accent-wash)] font-mono text-[10px] font-semibold text-[var(--cx-accent)] cursor-pointer transition-colors hover:bg-[var(--cx-accent)] hover:text-white hover:border-[var(--cx-accent)]"
                >
                  <button type="button" onClick={() => onCite?.(id)} title="View source passage">
                    {String(children).replace(/^\[|\]$/g, '')}
                  </button>
                </Badge>
              )
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: 'var(--cx-accent)' }} {...rest}>{children}</a>
          },
          table: p => <div className="my-3 overflow-x-auto cx-scroll-thin"><table className="w-full text-[13px] border-collapse" {...p} /></div>,
          th: p => <th className="text-left font-semibold px-3 py-1.5 border" style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-paper-2)' }} {...p} />,
          td: p => <td className="px-3 py-1.5 border align-top" style={{ borderColor: 'var(--cx-line)' }} {...p} />,
          code: ({ className, children, ...rest }) => {
            const lang = /language-(\w+)/.exec(className || '')?.[1]
            const text = String(children).replace(/\n$/, '')
            if (!className && !text.includes('\n')) {
              return <code className="font-mono text-[13px] px-1.5 py-0.5 rounded cx-num" style={{ background: 'var(--cx-paper-2)', color: 'var(--cx-ink-2)', border: '1px solid var(--cx-line)' }} {...rest}>{children}</code>
            }
            return <CodeBlock lang={lang || ''} code={text} />
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {src}
      </ReactMarkdown>
    </div>
  )
}

/* ── Main ChatWindow ────────────────────────────────────────────── */
export function ChatWindow({
  sessionId,
  workspaceId,
  workspaceName,
  docNames = [],
  initialMessages,
  hasDocuments = true,
}: {
  sessionId: string
  workspaceId: string
  workspaceName?: string
  docNames?: string[]
  initialMessages: Message[]
  hasDocuments?: boolean
}) {
  const [messages,    setMessages]    = useState<Message[]>(initialMessages)
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([])
  const [followUps,     setFollowUps]     = useState<string[]>([])
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null)
  const [focused,       setFocused]       = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [uploadNote,  setUploadNote]  = useState<string | null>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const emptyUploadRef = useRef<HTMLInputElement>(null)
  const composerUploadRef = useRef<HTMLInputElement>(null)
  const abortRef    = useRef<AbortController | null>(null)
  const autoSubmitRef = useRef(false)
  const router      = useRouter()
  const reduceMotion = useReducedMotion()

  const SUGGESTED = buildSuggestedPrompts(docNames)

  // Only auto-scroll when the user is already near the bottom, so scrolling up
  // to re-read an earlier message isn't yanked back down on every token.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [messages, loading, reduceMotion])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // On touch keyboards Enter should insert a newline; send is the button.
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    if (e.key === 'Enter' && !e.shiftKey && !touch) { e.preventDefault(); handleSubmit() }
  }

  async function uploadFile(file: File) {
    setUploading(true)
    setUploadNote(`Uploading ${file.name}…`)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('workspaceId', workspaceId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok || !res.body) { setUploadNote('Upload failed. Try again.'); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop() ?? ''
        for (const p of parts) {
          if (!p.startsWith('data:')) continue
          try {
            const evt = JSON.parse(p.slice(p.indexOf(':') + 1).trim())
            if (evt.error) setUploadNote(`Error: ${evt.error}`)
            else if (evt.stage === 'embedded') { setUploadNote(`${file.name} indexed`); router.refresh() }
            else if (evt.label) setUploadNote(evt.label)
          } catch {}
        }
      }
    } catch {
      setUploadNote('Network error during upload.')
    } finally {
      setUploading(false)
      if (emptyUploadRef.current) emptyUploadRef.current.value = ''
      if (composerUploadRef.current) composerUploadRef.current.value = ''
      setTimeout(() => setUploadNote(null), 4000)
    }
  }

  function handleUploadInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  async function handleSubmit(overrideInput?: string) {
    const query = (overrideInput ?? input).trim()
    if (!query || loading) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setLoading(true)
    setActiveTools([])
    setFollowUps([])

    const now = new Date().toISOString()
    const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: query, created_at: now },
      { id: assistantId, role: 'assistant', content: '', sources: [] },
    ])

    const controller = new AbortController()
    abortRef.current = controller
    let streamedAny = false

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, workspaceId, query }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.text().catch(() => '')
        if (response.status === 429) throw new Error('rate_limit')
        if (response.status === 401) throw new Error('unauthorized')
        throw new Error(`${response.status}: ${body || 'Unknown error'}`)
      }

      const reader  = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const event = JSON.parse(part.slice(6))
            if (event.type === 'tool') {
              setActiveTools(prev => {
                const idx = prev.findIndex(t => t.name === event.name)
                if (idx >= 0) {
                  const next = [...prev]
                  next[idx] = { name: event.name, status: event.status, count: event.count }
                  return next
                }
                return [...prev, { name: event.name, status: event.status, count: event.count }]
              })
            } else if (event.type === 'token') {
              streamedAny = true
              setMessages(prev => {
                const msgs = [...prev]
                const last = msgs[msgs.length - 1]
                msgs[msgs.length - 1] = { ...last, content: last.content + event.text }
                return msgs
              })
            } else if (event.type === 'done') {
              const doneTime = new Date().toISOString()
              setMessages(prev => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = {
                  ...msgs[msgs.length - 1],
                  sources: event.sources ?? [],
                  created_at: doneTime,
                  answered_from: event.answered_from,
                }
                return msgs
              })
              setActiveTools([])
            } else if (event.type === 'follow_ups') {
              if (Array.isArray(event.questions)) setFollowUps(event.questions)
            } else if (event.type === 'error') {
              setMessages(prev => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], error: event.message || 'Something went wrong.' }
                return msgs
              })
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      const aborted = err?.name === 'AbortError'
      const msg = err?.message ?? ''
      const errText = aborted
        ? 'Stopped.'
        : msg === 'rate_limit'
          ? 'Rate limit reached — 20 messages per minute. Wait a moment and retry.'
          : msg === 'unauthorized'
            ? 'Session expired. Refresh the page and try again.'
            : `Something went wrong.${msg ? ` (${msg})` : ' Please try again.'}`
      setMessages(prev => {
        const msgs = [...prev]
        const last = msgs[msgs.length - 1]
        // Keep any partial text; attach the notice below it.
        msgs[msgs.length - 1] = streamedAny || last.content
          ? { ...last, error: errText }
          : { ...last, content: '', error: errText }
        return msgs
      })
    } finally {
      abortRef.current = null
      setLoading(false)
      setActiveTools([])
    }
  }

  const isEmpty = messages.length === 0

  // Auto-send a question passed via ?q= (Home composer, global search). Fires
  // once per mount; the guard survives strict-mode's double effect invocation.
  useEffect(() => {
    if (typeof window === 'undefined' || autoSubmitRef.current) return
    const q = new URLSearchParams(window.location.search).get('q')
    if (!q) return
    autoSubmitRef.current = true
    window.history.replaceState({}, '', window.location.pathname)
    handleSubmit(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--cx-paper)' }}>

      {/* Screen-reader announcement of the streaming answer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? 'Cortex is responding…' : messages.at(-1)?.role === 'assistant' ? messages.at(-1)?.content : ''}
      </div>

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <ChatTopBar subtitle={workspaceName}>
        {/* Knowledge base doc count */}
        {docNames.length > 0 && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>
            <Database size={10} />
            <span className="cx-num">{docNames.length}</span> doc{docNames.length !== 1 ? 's' : ''}
          </span>
        )}
        {messages.length > 0 && (
          <button
            onClick={() => exportConversation(messages, workspaceName)}
            title="Export conversation as Markdown"
            aria-label="Export conversation as Markdown"
            className="size-9 -m-1 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--cx-paper-2)]"
            style={{ color: 'var(--cx-mute-2)' }}
          >
            <Download size={13} />
          </button>
        )}
        <span className="text-[11.5px] cx-num" style={{ color: 'var(--cx-mute-2)' }}>Gemini Flash</span>
      </ChatTopBar>

      {/* ── Message area ──────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto cx-scroll-thin scroll-smooth">

        {/* Empty state - no documents */}
        <AnimatePresence>
          {isEmpty && !hasDocuments && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="relative flex flex-col items-center justify-center min-h-full px-6 py-20 gap-6"
            >
              <input
                ref={emptyUploadRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx"
                onChange={handleUploadInput}
              />
              <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm">
                <div
                  className="size-11 rounded-md border flex items-center justify-center"
                  style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)' }}
                >
                  <UploadCloud size={20} style={{ color: 'var(--cx-mute-1)' }} />
                </div>
                <div>
                  <p className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>
                    Add your first document to start asking
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--cx-mute-1)' }}>
                    Connect Google Drive in Settings, or upload a file here. Cortex reads it so you can ask questions and get cited answers.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a
                    href="/analytics#google-drive"
                    className="cx-btn-ink flex items-center gap-2 h-8 px-3.5 rounded-md text-[12.5px] font-medium"
                  >
                    <HardDrive size={14} /> Connect Google Drive
                  </a>
                  <button
                    onClick={() => emptyUploadRef.current?.click()}
                    disabled={uploading}
                    className="cx-btn-ghost flex items-center gap-2 h-8 px-3.5 rounded-md text-[12.5px] font-medium disabled:opacity-60"
                  >
                    {uploading
                      ? <><span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Uploading…</>
                      : <><UploadCloud size={14} />Upload a file</>}
                  </button>
                </div>
                {uploadNote && (
                  <p className="text-[12px]" style={{ color: 'var(--cx-mute-1)' }}>{uploadNote}</p>
                )}
                <p className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>
                  PDF, DOCX, XLSX · up to 50 MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state - has documents, no messages yet */}
        <AnimatePresence>
          {isEmpty && hasDocuments && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="relative flex flex-col items-center justify-center min-h-full px-6 py-20 gap-8"
            >
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div
                  className="size-11 rounded-md border flex items-center justify-center"
                  style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)' }}
                >
                  <Image src="/CortexLogo.png" alt="Cortex" width={22} height={22} className="object-contain" />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <DynamicGreeting />
                </motion.div>
              </div>

              {/* Document-aware suggested prompts */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-[500px]">
                {SUGGESTED.map((s, i) => (
                  <PromptCard
                    key={s}
                    label={s}
                    index={i}
                    onClick={() => handleSubmit(s)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation */}
        {!isEmpty && (
          <div className="max-w-[720px] mx-auto px-6 pt-10 pb-4 space-y-10">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1 && loading
                const timeStr = formatTime(msg.created_at)
                const key = msg.id ?? `idx-${i}`

                if (msg.role === 'user') {
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-end gap-1"
                    >
                      <div
                        className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] leading-[1.65] whitespace-pre-wrap"
                        style={{
                          background: 'var(--cx-accent-wash)',
                          color: 'var(--cx-ink)',
                          border: '1px solid var(--cx-accent-line)',
                        }}
                      >
                        {msg.content}
                      </div>
                      {timeStr && (
                        <span className="text-[10.5px] cx-num pr-1" style={{ color: 'var(--cx-mute-2)' }} suppressHydrationWarning>
                          {timeStr}
                        </span>
                      )}
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-3.5 items-start"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-0.5 relative">
                      <div
                        className="size-7 rounded-full border flex items-center justify-center overflow-hidden"
                        style={{
                          background:  isLastAssistant ? 'var(--cx-accent)' : 'var(--cx-surface)',
                          borderColor: isLastAssistant ? 'transparent'       : 'var(--cx-line)',
                          transition:  'background 0.4s ease, border-color 0.4s ease',
                        }}
                      >
                        {isLastAssistant ? (
                          <motion.div
                            className="size-[9px] rounded-full"
                            style={{ background: 'rgba(255,255,255,0.85)' }}
                            animate={reduceMotion ? undefined : { scale: [1, 0.55, 1], opacity: [1, 0.55, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        ) : (
                          <Image src="/CortexLogo.png" alt="Cortex" width={15} height={15} className="object-contain opacity-75" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2.5 pt-0.5">
                      {/* Thinking orb */}
                      <AnimatePresence>
                        {isLastAssistant && msg.content === '' && (
                          <ThinkingOrb tools={activeTools} />
                        )}
                      </AnimatePresence>

                      {/* Tool-done badges */}
                      <AnimatePresence>
                        {isLastAssistant && activeTools.some(t => t.status === 'done') && msg.content !== '' && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-wrap gap-1.5"
                          >
                            {activeTools.filter(t => t.status === 'done').map(t => (
                              <Badge
                                key={t.name}
                                variant="outline"
                                className="gap-1.5 border-transparent bg-[var(--cx-ok-wash)] text-[11px] font-medium text-[var(--cx-mute-1)]"
                              >
                                <CheckCircle2 size={11} style={{ color: 'var(--cx-ok)' }} />
                                {t.name === 'search_documents'
                                  ? `${t.count ?? 0} sources found`
                                  : t.name === 'relevance_check'
                                    ? 'Relevance checked'
                                    : t.name === 'query_rewrite'
                                      ? 'Query refined'
                                      : 'Done'}
                              </Badge>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Message content */}
                      {msg.content && (
                        <div>
                          {isLastAssistant ? (
                            <span className="inline">
                              <StreamingContent content={msg.content} />
                              <motion.span
                                animate={reduceMotion ? undefined : { opacity: [1, 0, 1] }}
                                transition={{ repeat: Infinity, duration: 0.85, ease: 'easeInOut' }}
                                className="inline-block w-[2px] h-[15px] ml-0.5 rounded-full"
                                style={{ background: 'var(--cx-accent)', verticalAlign: '-3px' }}
                              />
                            </span>
                          ) : (
                            <Markdown content={msg.content} onCite={id => setActiveChunkId(id)} />
                          )}
                        </div>
                      )}

                      {/* Inline error notice (keeps any streamed partial above) */}
                      {msg.error && (
                        <div
                          className="flex items-start gap-2 mt-1 px-3 py-2 rounded-lg border text-[12.5px]"
                          style={{ color: 'var(--cx-err)', borderColor: 'rgba(166,68,58,0.25)', background: 'rgba(166,68,58,0.05)' }}
                        >
                          <span className="flex-1">{msg.error}</span>
                          <button
                            onClick={() => handleSubmit(messages[i - 1]?.content)}
                            className="font-semibold underline underline-offset-2 flex-shrink-0"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {/* Grounding badge + message actions */}
                      {!loading && msg.content && !isLastAssistant && (
                        <div className="flex items-center gap-2 pt-1">
                          {msg.answered_from && <AnsweredFromBadge kind={msg.answered_from} />}
                          <MsgActions
                            content={msg.content}
                            onRegenerate={() => handleSubmit(messages[i - 1]?.content)}
                          />
                        </div>
                      )}

                      {/* Timestamp + Sources row */}
                      <div className="flex items-center justify-between">
                        {!loading && msg.sources && msg.sources.length > 0 && (
                          <SourceCitations
                            sources={msg.sources}
                            onViewChunk={id => setActiveChunkId(id)}
                          />
                        )}
                        {timeStr && !isLastAssistant && (
                          <span className="text-[10.5px] cx-num ml-auto" style={{ color: 'var(--cx-mute-2)' }} suppressHydrationWarning>
                            {timeStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Follow-up question chips */}
        <AnimatePresence>
          {followUps.length > 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[720px] mx-auto px-6 pb-6"
            >
              <p className="cx-rule-label mb-2.5">Suggested questions</p>
              <div className="flex flex-col gap-2">
                {followUps.map((q, i) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => handleSubmit(q)}
                    className="group text-left flex items-center gap-2.5 px-3 py-2 rounded-md border text-[13px] transition-colors"
                    style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-surface)', color: 'var(--cx-ink-2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--cx-surface)')}
                  >
                    <Sparkles size={11} className="flex-shrink-0" style={{ color: 'var(--cx-mute-2)' }} />
                    <span className="flex-1">{q}</span>
                    <ArrowUp size={11} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity -rotate-45" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-6" />
      </div>

      {/* ── Citation side panel ───────────────────────────────────── */}
      <DocumentReaderPanel
        chunkId={activeChunkId}
        onClose={() => setActiveChunkId(null)}
      />

      {/* ── Input bar ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 relative" style={{ background: 'var(--cx-paper)' }}>
        <div
          className="absolute -top-10 inset-x-0 h-10 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--cx-paper))' }}
        />

        <div
          className="relative z-20 px-6 pb-6 pt-3 border-t"
          style={{ borderColor: 'var(--cx-line)' }}
        >
          <div className="max-w-[720px] mx-auto">
            <div
              className="cx-panel overflow-hidden transition-all duration-150"
              style={{
                borderColor: focused ? 'var(--cx-line-2)' : 'var(--cx-line)',
                boxShadow: focused
                  ? '0 0 0 3px var(--cx-accent-wash), 0 10px 24px -14px rgba(28,25,23,0.10)'
                  : undefined,
              }}
            >
              <label htmlFor="cx-composer" className="sr-only">Ask a question about your documents</label>
              <textarea
                id="cx-composer"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Ask Cortex anything about your documents…"
                disabled={loading}
                className="w-full resize-none bg-transparent text-[14.5px] outline-none leading-relaxed px-5 pt-4 pb-3 disabled:opacity-60 max-h-[180px] font-[inherit]"
                style={{ color: 'var(--cx-ink)', caretColor: 'var(--cx-accent)' }}
              />

              <input
                ref={composerUploadRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx"
                onChange={handleUploadInput}
              />

              <div className="flex items-center justify-between px-3 pb-3">
                <button
                  type="button"
                  aria-label="Attach a document"
                  onClick={() => composerUploadRef.current?.click()}
                  disabled={uploading}
                  className="size-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 hover:bg-[var(--cx-paper-2)]"
                  style={{ color: 'var(--cx-mute-1)' }}
                >
                  <Plus size={15} />
                </button>

                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-medium hidden sm:block" style={{ color: 'var(--cx-mute-2)' }}>
                    Shift ↵ new line
                  </span>
                  {loading ? (
                    <button
                      onClick={handleStop}
                      aria-label="Stop generating"
                      className="size-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                      style={{ background: 'var(--cx-ink)', color: '#f9f8f5' }}
                    >
                      <Square size={13} strokeWidth={2.5} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubmit()}
                      disabled={!input.trim()}
                      aria-label="Send message"
                      className="size-8 rounded-md flex items-center justify-center transition-colors"
                      style={{
                        background: input.trim() ? 'var(--cx-ink)' : 'var(--cx-paper-2)',
                        color:      input.trim() ? '#fafafa'       : 'var(--cx-mute-2)',
                        border:     input.trim() ? '1px solid var(--cx-ink)' : '1px solid var(--cx-line)',
                        cursor:     input.trim() ? 'pointer'       : 'not-allowed',
                      }}
                    >
                      <ArrowUp size={15} strokeWidth={2.25} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-[11.5px] mt-2.5" style={{ color: 'var(--cx-mute-1)' }}>
              Cortex can be wrong - verify important details against the cited sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
