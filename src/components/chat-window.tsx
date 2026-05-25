'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import Image from 'next/image'
import {
  FileText, ArrowUp, Plus,
  ChevronDown, Sparkles, CheckCircle2, UploadCloud,
} from 'lucide-react'
import { DynamicGreeting } from '@/components/DynamicGreeting'
import { uploadDocument } from '@/app/actions'

/* ── Types ──────────────────────────────────────────────────────── */
type Source = {
  chunk_id: string
  document_id: string | null
  document_name: string
  content: string
  similarity: number
}
type ToolEvent = { name: string; status: 'running' | 'done'; count?: number }
type Message   = { id?: string; role: 'user' | 'assistant'; content: string; sources?: Source[] }

const SUGGESTED = [
  'Summarize the key points',
  'What are the main topics?',
  'Explain the core concepts',
  'Find specific information',
]

/* ── Streaming text — per-chunk blur reveal ─────────────────────── */
function StreamingContent({ content }: { content: string }) {
  const chunksRef = useRef<string[]>([])
  const lenRef    = useRef(0)

  if (content.length > lenRef.current) {
    chunksRef.current = [...chunksRef.current, content.slice(lenRef.current)]
    lenRef.current = content.length
  }

  return (
    <span
      className="whitespace-pre-wrap break-words text-[15px] leading-[1.85]"
      style={{ color: 'var(--cx-ink-2)' }}
    >
      {chunksRef.current.map((chunk, i) => (
        <span key={i} className="cx-token">{chunk}</span>
      ))}
    </span>
  )
}

/* ── Morphing thinking orb ──────────────────────────────────────── */
function ThinkingOrb({ tools }: { tools: ToolEvent[] }) {
  const running = tools.find(t => t.status === 'running')
  const done    = tools.filter(t => t.status === 'done')
  const isDone  = !running && done.length > 0

  const label = running
    ? (running.name === 'search_documents' ? 'Searching documents\u2026' : 'Searching the web\u2026')
    : done.length > 0
      ? `Found ${done.at(-1)?.count ?? 0} sources`
      : 'Thinking\u2026'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-3 py-1"
    >
      <div className="relative flex-shrink-0 size-5">
        {isDone ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <CheckCircle2 size={18} style={{ color: 'var(--cx-ok)' }} />
          </motion.div>
        ) : (
          <>
            {/* Morphing blob */}
            <motion.div
              className="size-5 rounded-full"
              style={{ background: 'var(--cx-accent)' }}
              animate={{
                borderRadius: [
                  '50%',
                  '38% 62% 63% 37% / 41% 44% 56% 59%',
                  '44% 56% 32% 68% / 60% 38% 62% 40%',
                  '30% 70% 60% 40% / 50% 60% 40% 50%',
                  '50%',
                ],
                scale: [1, 1.14, 0.93, 1.1, 1],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Ambient glow halo */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: 'var(--cx-accent)', filter: 'blur(10px)' }}
              animate={{ scale: [1, 2.1, 1], opacity: [0.38, 0.04, 0.38] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}
      </div>

      <div className="relative overflow-hidden">
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
        {!isDone && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, var(--cx-paper) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.7 }}
          />
        )}
      </div>
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

function SourceCitations({ sources }: { sources: Source[] }) {
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
        className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-[12px] font-medium transition-all duration-200"
        style={{
          background:   open ? 'var(--cx-accent-wash)' : 'var(--cx-paper-2)',
          borderColor:  open ? 'var(--cx-accent-line)' : 'var(--cx-line)',
          color:        open ? 'var(--cx-accent)'      : 'var(--cx-mute-1)',
        }}
      >
        <FileText size={11} />
        {sources.length} source{sources.length !== 1 ? 's' : ''}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex"
        >
          <ChevronDown size={11} />
        </motion.span>
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
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-3 p-3 rounded-xl border cursor-default transition-all duration-200"
                  style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--cx-accent-line)'
                    e.currentTarget.style.background  = 'var(--cx-accent-wash)'
                    e.currentTarget.style.boxShadow   = '0 2px 14px rgba(122,31,90,0.09)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--cx-line)'
                    e.currentTarget.style.background  = 'var(--cx-surface)'
                    e.currentTarget.style.boxShadow   = 'none'
                  }}
                >
                  <div
                    className="size-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                    style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
                  >
                    <FileText size={13} style={{ color: 'var(--cx-accent)' }} />
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
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Prompt card — 3D magnetic tilt ────────────────────────────── */
function PromptCard({
  label, index, onClick,
}: { label: string; index: number; onClick: () => void }) {
  const x    = useMotionValue(0)
  const y    = useMotionValue(0)
  const rotX = useSpring(useTransform(y, [-40, 40], [7, -7]),   { stiffness: 180, damping: 18 })
  const rotY = useSpring(useTransform(x, [-80, 80], [-7, 7]),   { stiffness: 180, damping: 18 })

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 + index * 0.07, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 700 }}
      whileTap={{ scale: 0.95 }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - r.left  - r.width  / 2)
        y.set(e.clientY - r.top   - r.height / 2)
      }}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      onClick={onClick}
      className="cx-prompt-card text-left px-4 py-3.5 rounded-2xl border text-[13px] font-medium"
    >
      <Sparkles size={11} className="mb-2" style={{ color: 'var(--cx-accent)', opacity: 0.65 }} />
      <span style={{ color: 'inherit' }}>{label}</span>
    </motion.button>
  )
}

/* ── Markdown renderer ──────────────────────────────────────────── */
function renderMarkdown(text: string) {
  const lines    = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0, k = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={k++} className="text-xl font-semibold tracking-tight mt-5 mb-2" style={{ color: 'var(--cx-ink)' }}>
          {inlineFormat(line.slice(2))}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={k++} className="text-[17px] font-semibold tracking-tight mt-4 mb-1.5" style={{ color: 'var(--cx-ink)' }}>
          {inlineFormat(line.slice(3))}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={k++} className="text-[15px] font-semibold mt-3 mb-1" style={{ color: 'var(--cx-ink-2)' }}>
          {inlineFormat(line.slice(4))}
        </h3>
      )
    } else if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      elements.push(
        <div key={k++} className="my-3 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--cx-line)' }}>
          {lang && (
            <div className="px-4 py-1.5 border-b cx-rule-label" style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)' }}>
              {lang}
            </div>
          )}
          <pre className="text-[13px] leading-relaxed p-4 overflow-x-auto font-mono" style={{ background: 'var(--cx-ink)', color: '#a5d6a7' }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
    } else if (line.match(/^[-*•]\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*•]\s/)) { items.push(lines[i].slice(2)); i++ }
      elements.push(
        <ul key={k++} className="my-2 space-y-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 leading-relaxed text-[15px]" style={{ color: 'var(--cx-ink-2)' }}>
              <span className="mt-2.5 size-1 rounded-full flex-shrink-0" style={{ background: 'var(--cx-mute-2)' }} />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    } else if (line.match(/^\d+\.\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++ }
      elements.push(
        <ol key={k++} className="my-2 space-y-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-3 leading-relaxed text-[15px]" style={{ color: 'var(--cx-ink-2)' }}>
              <span className="mt-0.5 min-w-[1.25rem] text-[12px] font-bold cx-num flex-shrink-0" style={{ color: 'var(--cx-accent)' }}>
                {j + 1}.
              </span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    } else if (line.match(/^---+$/)) {
      elements.push(<hr key={k++} className="my-4" style={{ borderColor: 'var(--cx-line)' }} />)
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={k++} className="my-3 pl-4 border-l-2 text-[15px] cx-serif italic" style={{ borderColor: 'var(--cx-accent-line)', color: 'var(--cx-mute-1)' }}>
          {inlineFormat(line.slice(2))}
        </blockquote>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={k++} className="h-2" />)
    } else {
      elements.push(
        <p key={k++} className="leading-[1.85] my-0.5 text-[15px]" style={{ color: 'var(--cx-ink-2)' }}>
          {inlineFormat(line)}
        </p>
      )
    }
    i++
  }
  return elements
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold" style={{ color: 'var(--cx-ink)' }}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="cx-serif italic" style={{ color: 'var(--cx-mute-1)' }}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-[13px] px-1.5 py-0.5 rounded cx-num" style={{ background: 'var(--cx-paper-2)', color: 'var(--cx-ink-2)', border: '1px solid var(--cx-line)' }}>{part.slice(1, -1)}</code>
    return part
  })
}

/* ── Main ChatWindow ────────────────────────────────────────────── */
export function ChatWindow({
  sessionId,
  workspaceId,
  initialMessages,
  hasDocuments = true,
}: {
  sessionId: string
  workspaceId: string
  initialMessages: Message[]
  hasDocuments?: boolean
}) {
  const [messages,    setMessages]    = useState<Message[]>(initialMessages)
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([])
  const [focused,     setFocused]     = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const emptyUploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  async function handleEmptyUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('workspaceId', workspaceId)
    await uploadDocument(fd)
    setUploading(false)
    if (emptyUploadRef.current) emptyUploadRef.current.value = ''
  }

  async function handleSubmit(overrideInput?: string) {
    const query = (overrideInput ?? input).trim()
    if (!query || loading) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setLoading(true)
    setActiveTools([])

    setMessages(prev => [
      ...prev,
      { role: 'user',      content: query },
      { role: 'assistant', content: '', sources: [] },
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, workspaceId, query }),
      })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)

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
              setMessages(prev => {
                const msgs = [...prev]
                const last = msgs[msgs.length - 1]
                msgs[msgs.length - 1] = { ...last, content: last.content + event.text }
                return msgs
              })
            } else if (event.type === 'done') {
              setMessages(prev => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], sources: event.sources ?? [] }
                return msgs
              })
              setActiveTools([])
            } else if (event.type === 'error') {
              setMessages(prev => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: `**Error:** ${event.message}` }
                return msgs
              })
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setMessages(prev => {
        const msgs = [...prev]
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: '**Something went wrong.** Please try again.' }
        return msgs
      })
    } finally {
      setLoading(false)
      setActiveTools([])
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--cx-paper)' }}>

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-between h-[50px] px-5 border-b"
        style={{ background: 'var(--cx-paper)', borderColor: 'var(--cx-line)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="size-6 rounded-lg flex items-center justify-center border flex-shrink-0"
            style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
          >
            <Sparkles size={12} style={{ color: 'var(--cx-accent)' }} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--cx-ink)' }}>Cortex</span>
          <span className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>·</span>
          <span className="text-[12px]" style={{ color: 'var(--cx-mute-1)' }}>Document Chat</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--cx-ok)' }} />
          <span className="text-[11.5px] cx-num" style={{ color: 'var(--cx-mute-1)' }}>Gemini Flash</span>
          <span
            className="hidden sm:block text-[11px] px-1.5 py-0.5 rounded border cx-num"
            style={{ color: 'var(--cx-mute-2)', borderColor: 'var(--cx-line)', background: 'var(--cx-paper-2)' }}
          >
            Hybrid RAG
          </span>
        </div>
      </div>

      {/* ── Message area ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto cx-scroll-thin scroll-smooth">

        {/* Empty state */}
        <AnimatePresence>
          {isEmpty && !hasDocuments && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="relative flex flex-col items-center justify-center min-h-full px-6 py-20 gap-6"
            >
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(122,31,90,0.05) 0%, transparent 65%)' }}
              />
              <input
                ref={emptyUploadRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.md,.csv"
                onChange={handleEmptyUpload}
              />
              <div className="relative z-10 flex flex-col items-center gap-5 text-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="size-20 rounded-[1.6rem] border flex items-center justify-center"
                  style={{
                    background: 'var(--cx-accent-wash)',
                    borderColor: 'var(--cx-accent-line)',
                    boxShadow: '0 8px 32px rgba(122,31,90,0.1)',
                  }}
                >
                  <UploadCloud size={32} style={{ color: 'var(--cx-accent)' }} />
                </motion.div>
                <div>
                  <p className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>
                    Upload your first document to get started
                  </p>
                  <p className="mt-2 text-[13.5px]" style={{ color: 'var(--cx-mute-1)' }}>
                    Cortex will read and understand your documents so you can ask questions about them.
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => emptyUploadRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 h-10 px-6 rounded-full text-[13.5px] font-semibold border-2 transition-all duration-200 disabled:opacity-60"
                  style={{
                    borderColor: 'var(--cx-accent)',
                    color: 'var(--cx-accent)',
                    background: 'var(--cx-accent-wash)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-accent)', e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--cx-accent-wash)', e.currentTarget.style.color = 'var(--cx-accent)')}
                >
                  {uploading
                    ? <><span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Uploading…</>
                    : <><UploadCloud size={15} />Upload Document</>}
                </motion.button>
                <p className="text-[11px] font-mono" style={{ color: 'var(--cx-mute-2)' }}>
                  PDF · DOCX · TXT · MD · CSV · up to 50 MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state — has documents, no messages yet */}
        <AnimatePresence>
          {isEmpty && hasDocuments && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="relative flex flex-col items-center justify-center min-h-full px-6 py-20 gap-10"
            >
              {/* Ambient radial glow */}
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(122,31,90,0.07) 0%, transparent 65%)' }}
              />

              <div className="relative z-10 flex flex-col items-center gap-5">
                {/* Floating logo with orbiting ring */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative"
                >
                  <div
                    className="size-[68px] rounded-[1.35rem] border flex items-center justify-center"
                    style={{
                      background: 'var(--cx-surface)',
                      borderColor: 'var(--cx-line)',
                      boxShadow: '0 8px 32px rgba(122,31,90,0.12), 0 1px 0 rgba(255,255,255,0.85) inset',
                    }}
                  >
                    <Image src="/CortexLogo.png" alt="Cortex" width={36} height={36} className="object-contain" />
                  </div>
                  {/* Orbiting dashed ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute pointer-events-none"
                    style={{ inset: -12, borderRadius: 'calc(1.35rem + 12px)', border: '1px dashed var(--cx-line-2)' }}
                  />
                  {/* Accent dot that orbits */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute pointer-events-none"
                    style={{ inset: -12 }}
                  >
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full border-[1.5px]"
                      style={{ background: 'var(--cx-accent)', borderColor: 'var(--cx-paper)' }}
                    />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <DynamicGreeting />
                </motion.div>
              </div>

              {/* Suggested prompts */}
              <div className="relative z-10 grid grid-cols-2 gap-2.5 w-full max-w-[500px]">
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

                if (msg.role === 'user') {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="flex justify-end"
                    >
                      <div
                        className="max-w-[78%] rounded-2xl rounded-tr-md px-5 py-3.5 text-[14.5px] leading-[1.75] whitespace-pre-wrap"
                        style={{
                          background: 'var(--cx-surface)',
                          color: 'var(--cx-ink)',
                          border: '1px solid var(--cx-line)',
                          boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 16px rgba(10,10,10,0.05)',
                        }}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={i}
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
                            animate={{ scale: [1, 0.55, 1], opacity: [1, 0.55, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        ) : (
                          <Image src="/CortexLogo.png" alt="Cortex" width={15} height={15} className="object-contain opacity-75" />
                        )}
                      </div>
                      {/* Ripple ring when streaming */}
                      {isLastAssistant && (
                        <motion.div
                          className="absolute inset-0 rounded-full pointer-events-none"
                          style={{ border: '2px solid rgba(122,31,90,0.4)' }}
                          animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
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
                              <div
                                key={t.name}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium"
                                style={{
                                  color: 'var(--cx-ok)',
                                  background: 'var(--cx-ok-wash)',
                                  borderColor: 'rgba(60,110,71,0.2)',
                                }}
                              >
                                <CheckCircle2 size={10} strokeWidth={2.5} />
                                {t.name === 'search_documents'
                                  ? `${t.count ?? 0} sources found`
                                  : 'Web search done'}
                              </div>
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
                              {/* Blinking cursor */}
                              <motion.span
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ repeat: Infinity, duration: 0.85, ease: 'easeInOut' }}
                                className="inline-block w-[2px] h-[15px] ml-0.5 rounded-full"
                                style={{ background: 'var(--cx-accent)', verticalAlign: '-3px' }}
                              />
                            </span>
                          ) : (
                            <div className="text-[15px] leading-[1.85]">
                              {renderMarkdown(msg.content)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sources */}
                      {!loading && msg.sources && msg.sources.length > 0 && (
                        <SourceCitations sources={msg.sources} />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        <div ref={bottomRef} className="h-6" />
      </div>

      {/* ── Input bar ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 relative" style={{ background: 'var(--cx-paper)' }}>
        {/* Fade gradient above input */}
        <div
          className="absolute -top-10 inset-x-0 h-10 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--cx-paper))' }}
        />

        <div
          className="relative z-20 px-6 pb-6 pt-3 border-t"
          style={{ borderColor: 'var(--cx-line)' }}
        >
          <div className="max-w-[720px] mx-auto">
            {/* Input container with animated glow */}
            <motion.div
              animate={{
                boxShadow: focused
                  ? [
                      '0 0 0 3px var(--cx-accent-wash), 0 4px 24px rgba(122,31,90,0.09)',
                      '0 0 0 4.5px var(--cx-accent-wash), 0 8px 32px rgba(122,31,90,0.16)',
                      '0 0 0 3px var(--cx-accent-wash), 0 4px 24px rgba(122,31,90,0.09)',
                    ]
                  : '0 2px 8px rgba(10,10,10,0.04)',
              }}
              transition={
                focused
                  ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.25 }
              }
              className="rounded-2xl overflow-hidden transition-colors duration-200"
              style={{
                background:  focused ? 'var(--cx-surface)' : 'var(--cx-paper-2)',
                border:      `1.5px solid ${focused ? 'var(--cx-accent-line)' : 'var(--cx-line)'}`,
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Ask Cortex anything about your documents…"
                disabled={loading}
                autoFocus
                className="w-full resize-none bg-transparent text-[14.5px] outline-none leading-relaxed px-5 pt-4 pb-3 disabled:opacity-60 max-h-[180px] font-[inherit]"
                style={{ color: 'var(--cx-ink)', caretColor: 'var(--cx-accent)' }}
              />

              <div className="flex items-center justify-between px-3 pb-3">
                <button
                  type="button"
                  title="Attach file"
                  className="size-8 rounded-full flex items-center justify-center transition-all duration-150"
                  style={{ color: 'var(--cx-mute-2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--cx-paper-2)'; e.currentTarget.style.color = 'var(--cx-ink)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '';                   e.currentTarget.style.color = 'var(--cx-mute-2)' }}
                >
                  <Plus size={15} />
                </button>

                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-medium hidden sm:block" style={{ color: 'var(--cx-mute-2)' }}>
                    Shift ↵ new line
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    whileHover={input.trim() && !loading ? { scale: 1.07 } : {}}
                    onClick={() => handleSubmit()}
                    disabled={loading || !input.trim()}
                    className="size-8 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      background: input.trim() && !loading ? 'var(--cx-ink)' : 'var(--cx-line)',
                      color:      input.trim() && !loading ? '#f9f8f5'       : 'var(--cx-mute-2)',
                      cursor:     input.trim() && !loading ? 'pointer'       : 'not-allowed',
                      boxShadow:  input.trim() && !loading
                        ? '0 4px 14px rgba(10,10,10,0.28)'
                        : 'none',
                    }}
                  >
                    <ArrowUp size={15} strokeWidth={2.25} />
                  </motion.button>
                </div>
              </div>
            </motion.div>

            <p className="text-center text-[11px] mt-2.5 cx-num" style={{ color: 'var(--cx-mute-2)' }}>
              Always verify important information from source documents
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
