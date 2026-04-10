'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  FileText, Globe, Search, ArrowUp, Plus,
  ChevronDown, Sparkles, CheckCircle2,
} from 'lucide-react'
import { DynamicGreeting } from '@/components/DynamicGreeting'

type Source = {
  chunk_id: string
  document_id: string | null
  document_name: string
  content: string
  similarity: number
}

type ToolEvent = {
  name: string
  status: 'running' | 'done'
  count?: number
}

type Message = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

const SUGGESTED = [
  "Summarize the key points",
  "What are the main topics?",
  "Explain the core concepts",
  "Find specific information",
]

// ── Markdown renderer ──────────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0, k = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      elements.push(<h1 key={k++} className="text-xl font-bold text-zinc-950 mt-5 mb-2 tracking-tight">{inlineFormat(line.slice(2))}</h1>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={k++} className="text-[17px] font-bold text-zinc-900 mt-4 mb-1.5 tracking-tight">{inlineFormat(line.slice(3))}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={k++} className="text-[15px] font-bold text-zinc-800 mt-3 mb-1">{inlineFormat(line.slice(4))}</h3>)
    } else if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      elements.push(
        <div key={k++} className="my-3 rounded-2xl overflow-hidden border border-zinc-100">
          {lang && <div className="px-4 py-1.5 bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{lang}</div>}
          <pre className="bg-zinc-950 text-emerald-300 text-[13px] leading-relaxed p-4 overflow-x-auto font-mono"><code>{codeLines.join('\n')}</code></pre>
        </div>
      )
    } else if (line.match(/^[-*•]\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*•]\s/)) { items.push(lines[i].slice(2)); i++ }
      elements.push(
        <ul key={k++} className="my-2 space-y-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-zinc-700 leading-relaxed text-[15px]">
              <span className="mt-2 size-1.5 rounded-full bg-zinc-300 flex-shrink-0" />
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
            <li key={j} className="flex items-start gap-3 text-zinc-700 leading-relaxed text-[15px]">
              <span className="mt-0.5 min-w-[1.25rem] text-[12px] font-bold text-fuchsia-500">{j + 1}.</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    } else if (line.match(/^---+$/)) {
      elements.push(<hr key={k++} className="my-4 border-zinc-100" />)
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={k++} className="my-3 pl-4 border-l-2 border-zinc-200 text-zinc-500 italic text-[15px]">{inlineFormat(line.slice(2))}</blockquote>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={k++} className="h-2" />)
    } else {
      elements.push(<p key={k++} className="text-zinc-700 leading-[1.8] my-0.5 text-[15px]">{inlineFormat(line)}</p>)
    }
    i++
  }
  return elements
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-zinc-600">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="font-mono text-[13px] bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md">{part.slice(1, -1)}</code>
    return part
  })
}

// ── Thinking indicator ─────────────────────────────────────────────────────────
function ThinkingIndicator({ tools }: { tools: ToolEvent[] }) {
  const running = tools.find(t => t.status === 'running')
  const done = tools.filter(t => t.status === 'done')

  const label = running
    ? running.name === 'search_documents' ? 'Searching documents' : 'Searching the web'
    : done.length > 0
      ? done[done.length - 1].name === 'search_documents'
        ? `Found ${done[done.length - 1].count ?? 0} sources`
        : 'Web results ready'
      : 'Thinking'

  const isSearching = !!running
  const isDone = !running && done.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-1"
    >
      {/* Animated icon */}
      <div className="relative flex-shrink-0">
        {isSearching ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="size-5"
          >
            <Search className="size-5 text-fuchsia-500" />
          </motion.div>
        ) : isDone ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
            <CheckCircle2 className="size-5 text-emerald-500" />
          </motion.div>
        ) : (
          /* Pulsing brain/spark for "Thinking" */
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="size-5 text-fuchsia-400" />
          </motion.div>
        )}

        {/* Ripple ring when searching */}
        {isSearching && (
          <motion.div
            className="absolute inset-0 rounded-full border border-fuchsia-300"
            animate={{ scale: [1, 2], opacity: [0.6, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </div>

      {/* Label with shimmer when thinking */}
      <div className="relative overflow-hidden">
        <span className="text-[13.5px] font-medium text-zinc-500">{label}</span>
        {!isDone && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
          />
        )}
      </div>

      {/* Animated dots when thinking (no tools yet) */}
      {!isSearching && !isDone && (
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(j => (
            <motion.span
              key={j}
              className="size-1 rounded-full bg-zinc-300 inline-block"
              animate={{ y: [0, -4, 0], backgroundColor: ['#d4d4d8', '#d946ef', '#d4d4d8'] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: j * 0.2 }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ChatWindow({
  sessionId,
  workspaceId,
  initialMessages,
}: {
  sessionId: string
  workspaceId: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([])
  const [focused, setFocused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, activeTools])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
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
      { role: 'user', content: query },
      { role: 'assistant', content: '', sources: [] },
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, workspaceId, query }),
      })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
                if (idx >= 0) { const next = [...prev]; next[idx] = { name: event.name, status: event.status, count: event.count }; return next }
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
          } catch { }
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
    <div className="flex flex-col h-full bg-white">

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto scroll-smooth">

        {/* ── Empty / Welcome ── */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-full px-6 py-20 gap-10"
            >
              {/* Dynamic greeting */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col items-center gap-5"
              >
                {/* Spinning logo */}
                <div className="relative size-16 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-purple-50 border border-fuchsia-100/80 shadow-[0_4px_24px_rgba(192,38,211,0.1)] flex items-center justify-center">
                  <Image src="/CortexLogo.png" alt="Cortex" width={34} height={34} className="object-contain" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-2xl border border-fuchsia-200/30"
                    style={{ borderStyle: 'dashed' }}
                  />
                </div>
                <DynamicGreeting />
              </motion.div>

              {/* Suggestion chips */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-3 w-full max-w-lg"
              >
                {SUGGESTED.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38 + i * 0.07 }}
                    whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSubmit(s)}
                    className="text-left px-4 py-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 hover:bg-white hover:border-fuchsia-200/60 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-all shadow-sm group"
                  >
                    <Sparkles className="size-3.5 text-fuchsia-400 mb-2 group-hover:text-fuchsia-500 transition-colors" />
                    {s}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Conversation ── */}
        {!isEmpty && (
          <div className="max-w-[760px] mx-auto px-6 py-8 space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1 && loading

                if (msg.role === 'user') {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex justify-end"
                    >
                      {/* Gemini-style user bubble — subtle pill, no heavy shadow */}
                      <div className="max-w-[75%] bg-zinc-100 rounded-3xl rounded-tr-lg px-5 py-3.5 text-[15px] text-zinc-900 leading-relaxed font-normal">
                        {msg.content}
                      </div>
                    </motion.div>
                  )
                }

                // ── Assistant message ──
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-4 items-start"
                  >
                    {/* Avatar */}
                    <div className={`
                      flex-shrink-0 size-8 rounded-full border flex items-center justify-center mt-0.5
                      ${isLastAssistant
                        ? 'bg-gradient-to-br from-fuchsia-50 to-purple-50 border-fuchsia-200/60 shadow-[0_0_12px_rgba(192,38,211,0.15)]'
                        : 'bg-zinc-50 border-zinc-200/60'
                      }
                    `}>
                      {isLastAssistant ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        >
                          <Image src="/CortexLogo.png" alt="Cortex" width={18} height={18} className="object-contain" />
                        </motion.div>
                      ) : (
                        <Image src="/CortexLogo.png" alt="Cortex" width={18} height={18} className="object-contain" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3 pt-0.5">

                      {/* Thinking / tool indicator */}
                      <AnimatePresence>
                        {isLastAssistant && msg.content === '' && (
                          <ThinkingIndicator tools={activeTools} />
                        )}
                      </AnimatePresence>

                      {/* Tool done chips (while streaming) */}
                      <AnimatePresence>
                        {isLastAssistant && activeTools.some(t => t.status === 'done') && msg.content !== '' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-wrap gap-1.5 overflow-hidden"
                          >
                            {activeTools.filter(t => t.status === 'done').map(t => (
                              <div key={t.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11.5px] font-medium text-emerald-700">
                                <CheckCircle2 className="size-3" />
                                {t.name === 'search_documents' ? `${t.count ?? 0} sources found` : 'Web search done'}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Markdown content */}
                      {msg.content && (
                        <div className="text-[15px] leading-[1.8]">
                          {renderMarkdown(msg.content)}
                          {isLastAssistant && (
                            <motion.span
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ repeat: Infinity, duration: 0.9 }}
                              className="inline-block w-[2px] h-4 bg-fuchsia-400 ml-0.5 align-middle rounded-full"
                            />
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

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* ── Input bar — Gemini style ── */}
      <div className="flex-shrink-0 px-6 pb-6 pt-2">
        <div className="max-w-[760px] mx-auto">
          <motion.div
            animate={
              focused
                ? { boxShadow: '0 0 0 2px rgba(192,38,211,0.12), 0 4px_32px rgba(0,0,0,0.07)' }
                : { boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }
            }
            className={`
              relative bg-zinc-50 border rounded-3xl transition-colors duration-200 overflow-hidden
              ${focused ? 'border-zinc-300 bg-white' : 'border-zinc-200'}
            `}
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
              className="w-full resize-none bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none leading-relaxed px-5 pt-4 pb-3 disabled:opacity-60 max-h-[180px] font-[inherit]"
              style={{ height: 'auto' }}
            />

            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="h-8 w-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                  title="Attach"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-medium hidden sm:block">
                  Shift+Enter for new line
                </span>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSubmit()}
                  disabled={loading || !input.trim()}
                  className={`
                    size-8 rounded-full flex items-center justify-center transition-all duration-200
                    ${input.trim() && !loading
                      ? 'bg-zinc-900 hover:bg-zinc-700 text-white shadow-sm'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    }
                  `}
                >
                  <ArrowUp className="size-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          <p className="text-center text-[11px] text-zinc-400 mt-2.5 font-medium">
            Cortex uses{' '}
            <span className="bg-gradient-to-r from-fuchsia-500 to-violet-500 bg-clip-text text-transparent font-semibold">
              Gemini Flash
            </span>
            {' '}· Hybrid search · Verify important information
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Source citations ───────────────────────────────────────────────────────────
function SourceCitations({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-2"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[12px] font-medium text-zinc-500 hover:text-zinc-700 transition-all"
      >
        <FileText className="size-3 text-fuchsia-500" />
        {sources.length} source{sources.length > 1 ? 's' : ''}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-400"
        >
          <ChevronDown className="size-3" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-2">
              {sources.map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3 p-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 hover:bg-white hover:border-zinc-200 transition-colors"
                >
                  <div className="size-8 rounded-xl bg-fuchsia-50 border border-fuchsia-100/60 flex items-center justify-center flex-shrink-0">
                    <FileText className="size-3.5 text-fuchsia-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[12.5px] font-semibold text-zinc-800 truncate">{src.document_name}</p>
                      <span className="flex-shrink-0 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full font-bold">
                        {src.similarity}%
                      </span>
                    </div>
                    <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-2">{src.content}</p>
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
