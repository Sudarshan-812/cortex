'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Loader2, User, FileText, Globe, Search,
  Sparkles, ArrowUp, Plus, Mic,
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

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let k = 0 // dedicated key counter — always unique regardless of i jumps

  while (i < lines.length) {
    const line = lines[i]

    // H1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={k++} className="text-2xl font-bold text-zinc-950 mt-4 mb-2 tracking-tight">
          {inlineFormat(line.slice(2))}
        </h1>
      )
    }
    // H2
    else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={k++} className="text-xl font-bold text-zinc-900 mt-4 mb-1.5 tracking-tight">
          {inlineFormat(line.slice(3))}
        </h2>
      )
    }
    // H3
    else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={k++} className="text-base font-bold text-zinc-800 mt-3 mb-1">
          {inlineFormat(line.slice(4))}
        </h3>
      )
    }
    // Code block
    else if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <div key={k++} className="my-3 rounded-xl overflow-hidden border border-zinc-200">
          {lang && (
            <div className="px-4 py-1.5 bg-zinc-100 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              {lang}
            </div>
          )}
          <pre className="bg-zinc-950 text-emerald-300 text-[13px] leading-relaxed p-4 overflow-x-auto font-mono">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
    }
    // Bullet list
    else if (line.match(/^[-*•]\s/)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^[-*•]\s/)) {
        listItems.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={k++} className="my-2 space-y-1.5">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-zinc-700 leading-relaxed">
              <span className="mt-2 size-1.5 rounded-full bg-fuchsia-400 flex-shrink-0" />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      elements.push(
        <ol key={k++} className="my-2 space-y-1.5">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-zinc-700 leading-relaxed">
              <span className="mt-0.5 min-w-[1.25rem] text-[12px] font-bold text-fuchsia-500">{j + 1}.</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={k++} className="my-4 border-zinc-200" />)
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={k++} className="my-3 pl-4 border-l-2 border-fuchsia-300 text-zinc-500 italic">
          {inlineFormat(line.slice(2))}
        </blockquote>
      )
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={k++} className="h-2" />)
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={k++} className="text-zinc-700 leading-[1.75] my-0.5">
          {inlineFormat(line)}
        </p>
      )
    }

    i++
  }

  return elements
}

function inlineFormat(text: string): React.ReactNode {
  // Process inline: bold, italic, code, colored keywords
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-zinc-900">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-zinc-600">{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="font-mono text-[13px] bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 px-1.5 py-0.5 rounded-md">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

// ── Main component ────────────────────────────────────────────────────────────
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
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
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
    <div className="flex flex-col h-full bg-white relative">

      {/* ── Scrollable messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-6">

          {/* ── Empty / Welcome state ── */}
          <AnimatePresence>
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center min-h-[70vh] gap-8"
              >
                {/* Hero logo */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex flex-col items-center gap-4"
                >
                  {/* Spinning logo */}
                  <div className="relative size-20 rounded-3xl bg-gradient-to-br from-fuchsia-50 to-purple-50 border border-fuchsia-100 shadow-[0_8px_32px_rgba(192,38,211,0.12)] flex items-center justify-center">
                    <Image src="/CortexLogo.png" alt="Cortex" width={40} height={40} className="object-contain" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-3xl border border-fuchsia-200/40"
                      style={{ borderStyle: 'dashed' }}
                    />
                  </div>

                  {/* Time-aware greeting */}
                  <DynamicGreeting />
                </motion.div>

                {/* Suggestion chips */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 gap-3 w-full max-w-md"
                >
                  {SUGGESTED.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + i * 0.07 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSubmit(s)}
                      className="text-left px-4 py-3.5 rounded-2xl border border-zinc-200 bg-white hover:border-fuchsia-200 hover:shadow-[0_4px_16px_rgba(192,38,211,0.08)] text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-all shadow-sm group"
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
          <div className="py-6 space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1 && loading

                if (msg.role === 'user') {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-end"
                    >
                      <div className="flex items-end gap-3 max-w-[80%]">
                        <div className="bg-zinc-100 rounded-3xl rounded-br-lg px-5 py-3 text-[14.5px] text-zinc-900 leading-relaxed font-medium">
                          {msg.content}
                        </div>
                        <div className="flex-shrink-0 size-8 rounded-full bg-zinc-200 flex items-center justify-center mb-0.5">
                          <User className="size-4 text-zinc-600" />
                        </div>
                      </div>
                    </motion.div>
                  )
                }

                // Assistant message — Gemini style: no bubble, logo + flowing text
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex gap-4"
                  >
                    {/* Logo avatar */}
                    <div className="flex-shrink-0 size-9 rounded-full bg-gradient-to-br from-fuchsia-50 to-purple-50 border border-fuchsia-100 flex items-center justify-center shadow-sm mt-0.5">
                      <Image src="/CortexLogo.png" alt="Cortex" width={20} height={20} className="object-contain" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Tool indicators */}
                      <AnimatePresence>
                        {isLastAssistant && activeTools.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 overflow-hidden"
                          >
                            {activeTools.map((t, j) => (
                              <motion.div
                                key={t.name}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: j * 0.06 }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-[12.5px] font-medium text-zinc-500"
                              >
                                {t.name === 'search_documents'
                                  ? <Search className="size-3 text-fuchsia-500" />
                                  : <Globe className="size-3 text-emerald-500" />
                                }
                                {t.status === 'running'
                                  ? <>
                                      <span>
                                        {t.name === 'search_documents' ? 'Searching documents' : 'Searching web'}
                                      </span>
                                      <Loader2 className="size-3 animate-spin text-zinc-400" />
                                    </>
                                  : <span className="text-emerald-600 font-semibold">
                                      {t.name === 'search_documents'
                                        ? `Found ${t.count ?? 0} source${t.count !== 1 ? 's' : ''}`
                                        : 'Web results ready'}
                                    </span>
                                }
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Thinking dots — when loading with no content yet */}
                      {isLastAssistant && msg.content === '' && activeTools.length === 0 && (
                        <div className="flex items-center gap-1.5 py-2">
                          {[0, 1, 2].map(j => (
                            <motion.span
                              key={j}
                              className="size-2 rounded-full bg-zinc-300 inline-block"
                              animate={{ y: [0, -5, 0], backgroundColor: ['#d4d4d8', '#a855f7', '#d4d4d8'] }}
                              transition={{ duration: 0.9, repeat: Infinity, delay: j * 0.18 }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Rendered markdown content */}
                      {msg.content && (
                        <div className="prose-custom text-[14.5px] leading-[1.8]">
                          {renderMarkdown(msg.content)}
                          {isLastAssistant && (
                            <motion.span
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ repeat: Infinity, duration: 0.85 }}
                              className="inline-block w-[2px] h-[16px] bg-fuchsia-400 ml-0.5 align-middle rounded-full"
                            />
                          )}
                        </div>
                      )}

                      {/* Source citations */}
                      {!loading && msg.sources && msg.sources.length > 0 && (
                        <SourceCitations sources={msg.sources} />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar — Gemini style ── */}
      <div className="flex-shrink-0 pb-6 pt-3 px-6">
        <div className="max-w-[720px] mx-auto">
          <motion.div
            animate={focused ? { boxShadow: '0 0 0 2px rgba(192,38,211,0.15), 0 4px 24px rgba(0,0,0,0.08)' } : { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            className={`relative bg-white border rounded-3xl transition-colors duration-200 overflow-hidden ${
              focused ? 'border-zinc-300' : 'border-zinc-200'
            }`}
          >
            {/* Textarea */}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask Cortex anything..."
              disabled={loading}
              autoFocus
              className="w-full resize-none bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none leading-relaxed px-5 pt-4 pb-3 disabled:opacity-60 max-h-52 font-[inherit]"
              style={{ height: 'auto' }}
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="size-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                  title="Attach file"
                >
                  <Plus className="size-4.5" />
                </button>
                <button
                  type="button"
                  className="size-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                  title="Voice input"
                >
                  <Mic className="size-4" />
                </button>
              </div>

              {/* Send button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSubmit()}
                disabled={loading || !input.trim()}
                className={`size-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                  input.trim() && !loading
                    ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Loader2 className="size-4 animate-spin" />
                    </motion.span>
                  ) : (
                    <motion.span key="up" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <ArrowUp className="size-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </motion.div>

          {/* Bottom hint */}
          <p className="text-center text-[11.5px] text-zinc-400 mt-3 font-medium">
            Cortex uses{' '}
            <span className="bg-gradient-to-r from-fuchsia-500 to-violet-500 bg-clip-text text-transparent font-semibold">
              Gemini 3.1 Flash Lite
            </span>
            {' '}· Hybrid search + re-ranking · Verify important information
          </p>
        </div>
      </div>
    </div>
  )
}

function SourceCitations({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-1"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[12px] font-medium text-zinc-500 hover:text-zinc-700 transition-all"
      >
        <FileText className="size-3 text-fuchsia-500" />
        {sources.length} source{sources.length > 1 ? 's' : ''}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-zinc-400">
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-2">
              {sources.map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3 p-3 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors"
                >
                  <div className="size-8 rounded-xl bg-fuchsia-50 border border-fuchsia-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="size-3.5 text-fuchsia-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[12.5px] font-semibold text-zinc-800 truncate">{src.document_name}</p>
                      <span className="flex-shrink-0 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                        {src.similarity}%
                      </span>
                    </div>
                    <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">{src.content}</p>
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
