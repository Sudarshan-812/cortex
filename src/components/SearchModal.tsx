'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search, FileText, Loader2, X, ArrowUp, Hash } from 'lucide-react'
import { useModalA11y } from '@/lib/useModalA11y'

type Result = {
  chunk_id: string
  document_id: string | null
  document_name: string
  content: string
  similarity: number
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function SearchModal({
  open,
  onClose,
  workspaceId,
}: {
  open: boolean
  onClose: () => void
  workspaceId: string
}) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const [kbNav,   setKbNav]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const debouncedQuery = useDebounce(query, 320)
  const panelRef = useModalA11y<HTMLDivElement>(open, onClose)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  // Search on debounced query
  useEffect(() => {
    if (!debouncedQuery.trim() || !open) { setResults([]); return }
    let cancelled = false
    setLoading(true)
    fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: debouncedQuery, workspaceId }),
    })
      .then(r => r.json())
      .then(data => { if (!cancelled) setResults(data.results ?? []) })
      .catch(() => { if (!cancelled) setResults([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery, open, workspaceId])

  // Arrow-key navigation (Escape is handled by useModalA11y)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setKbNav(true); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setKbNav(true); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && (query.trim() || results.length > 0)) {
        e.preventDefault()
        openInChat()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, selected, query])

  function openInChat() {
    const q = query.trim()
    if (!q) return
    onClose()
    router.push(`/chat?q=${encodeURIComponent(q)}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    openInChat()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(10,8,6,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search your documents"
            onMouseMove={() => kbNav && setKbNav(false)}
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed left-1/2 -translate-x-1/2 top-[14vh] z-50 w-[calc(100%-2rem)] max-w-[580px] cx-panel overflow-hidden"
            style={{ boxShadow: '0 24px 80px rgba(10,8,6,0.22)' }}
          >
            {/* Search bar */}
            <form onSubmit={handleSubmit}>
              <div
                className="flex items-center gap-3 px-4 py-3.5 border-b"
                style={{ borderColor: 'var(--cx-line)' }}
              >
                {loading
                  ? <Loader2 size={16} className="flex-shrink-0 animate-spin" style={{ color: 'var(--cx-accent)' }} />
                  : <Search size={16} className="flex-shrink-0" style={{ color: 'var(--cx-mute-1)' }} />
                }
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(0) }}
                  placeholder="Search your documents…"
                  aria-label="Search your documents"
                  className="flex-1 bg-transparent text-[15px] outline-none"
                  style={{ color: 'var(--cx-ink)' }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
                    aria-label="Clear search"
                    className="size-8 -m-1 rounded flex items-center justify-center flex-shrink-0 hover:bg-[var(--cx-paper-2)]"
                    style={{ color: 'var(--cx-mute-2)' }}
                  >
                    <X size={13} />
                  </button>
                )}
                <kbd
                  onClick={onClose}
                  className="hidden sm:flex items-center h-5 px-1.5 rounded border text-[10px] font-mono cursor-pointer"
                  style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)', color: 'var(--cx-mute-2)' }}
                >
                  Esc
                </kbd>
              </div>
            </form>

            {/* Results */}
            <AnimatePresence mode="wait">
              {loading && results.length === 0 && query.trim() && (
                <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-6 flex items-center gap-2.5">
                  <Loader2 size={13} className="animate-spin" style={{ color: 'var(--cx-accent)' }} />
                  <span className="text-[12.5px]" style={{ color: 'var(--cx-mute-1)' }}>Searching…</span>
                </motion.div>
              )}
              {results.length > 0 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="max-h-[420px] overflow-y-auto cx-scroll-thin"
                >
                  <div className="px-2 py-1.5">
                    <p className="cx-rule-label px-2 mb-1">{results.length} result{results.length !== 1 ? 's' : ''}</p>
                    {results.map((r, i) => (
                      <button
                        key={r.chunk_id}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 mb-0.5"
                        style={{ background: selected === i ? 'var(--cx-paper-2)' : 'transparent' }}
                        onMouseEnter={() => { if (!kbNav) setSelected(i) }}
                        onClick={openInChat}
                      >
                        <div
                          className="size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border"
                          style={{
                            background:  selected === i ? 'var(--cx-accent-wash)' : 'var(--cx-paper)',
                            borderColor: selected === i ? 'var(--cx-accent-line)'  : 'var(--cx-line)',
                          }}
                        >
                          <FileText size={13} style={{ color: selected === i ? 'var(--cx-accent)' : 'var(--cx-mute-1)' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[12.5px] font-semibold truncate flex-1" style={{ color: 'var(--cx-ink)' }}>
                              {r.document_name}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Hash size={9} style={{ color: 'var(--cx-mute-2)' }} />
                              <span className="cx-num text-[10px]" style={{ color: 'var(--cx-mute-2)' }}>{r.similarity}%</span>
                            </div>
                          </div>
                          <p className="text-[12px] leading-relaxed line-clamp-2 cx-serif italic" style={{ color: 'var(--cx-mute-1)' }}>
                            {r.content.slice(0, 160)}…
                          </p>
                        </div>
                        {selected === i && (
                          <div className="flex-shrink-0 mt-1">
                            <ArrowUp size={12} style={{ color: 'var(--cx-accent)', transform: 'rotate(45deg)' }} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Empty state with hint */}
              {!loading && query && results.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 py-8 text-center"
                >
                  <p className="text-[13px] font-medium" style={{ color: 'var(--cx-mute-1)' }}>No results found</p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--cx-mute-2)' }}>
                    Try different keywords, or{' '}
                    <button
                      className="underline underline-offset-2"
                      style={{ color: 'var(--cx-accent)' }}
                      onClick={openInChat}
                    >
                      ask Cortex directly
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div
              className="flex items-center justify-between gap-4 px-4 py-2.5 border-t"
              style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-paper)' }}
            >
              <div className="flex items-center gap-4">
                {[['↑↓', 'navigate'], ['↵', 'open in chat'], ['esc', 'close']].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <kbd
                      className="flex items-center h-4 px-1.5 rounded border text-[10px] font-mono"
                      style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)', color: 'var(--cx-mute-2)' }}
                    >
                      {k}
                    </kbd>
                    <span className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <span className="text-[10.5px] cx-num" style={{ color: 'var(--cx-mute-2)' }}>Semantic search</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
