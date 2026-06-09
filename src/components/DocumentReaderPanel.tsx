'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Loader2, BookOpen } from 'lucide-react'
import { fetchChunkContext } from '@/app/session-actions'

type ChunkContext = {
  documentName: string
  targetId: string
  chunks: { id: string; content: string }[]
}

export function DocumentReaderPanel({
  chunkId,
  onClose,
}: {
  chunkId: string | null
  onClose: () => void
}) {
  const [data,    setData]    = useState<ChunkContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const targetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chunkId) { setData(null); return }
    setLoading(true)
    setError(null)
    fetchChunkContext(chunkId)
      .then(res => {
        if ('error' in res) { setError(res.error ?? 'Failed to load'); return }
        setData(res as ChunkContext)
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [chunkId])

  // Scroll highlighted chunk into view
  useEffect(() => {
    if (data && targetRef.current) {
      setTimeout(() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
    }
  }, [data])

  return (
    <AnimatePresence>
      {chunkId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(10,8,6,0.35)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[420px] max-w-[90vw]"
            style={{
              background: 'var(--cx-surface)',
              borderLeft: '1px solid var(--cx-line)',
              boxShadow: '-8px 0 40px rgba(10,8,6,0.12)',
            }}
          >
            {/* Header */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b"
              style={{ borderColor: 'var(--cx-line)' }}
            >
              <div
                className="size-8 rounded-lg flex items-center justify-center border flex-shrink-0"
                style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
              >
                <BookOpen size={14} style={{ color: 'var(--cx-accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="cx-rule-label mb-0.5">Source passage</p>
                {data && (
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--cx-ink)' }}>
                    {data.documentName}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="size-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                style={{ color: 'var(--cx-mute-2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--cx-paper-2)'; e.currentTarget.style.color = 'var(--cx-ink)' }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--cx-mute-2)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto cx-scroll-thin px-5 py-6">
              {loading && (
                <div className="flex items-center gap-3 py-12 justify-center">
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--cx-accent)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--cx-mute-1)' }}>Loading passage…</span>
                </div>
              )}

              {error && !loading && (
                <div className="py-12 text-center">
                  <p className="text-[13px]" style={{ color: 'var(--cx-err)' }}>{error}</p>
                </div>
              )}

              {data && !loading && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={12} style={{ color: 'var(--cx-mute-2)' }} />
                    <span className="text-[11px] font-mono uppercase tracking-[.1em]" style={{ color: 'var(--cx-mute-2)' }}>
                      {data.chunks.length} passage{data.chunks.length !== 1 ? 's' : ''} shown
                    </span>
                  </div>

                  {data.chunks.map((chunk, i) => {
                    const isTarget = chunk.id === data.targetId
                    return (
                      <motion.div
                        key={chunk.id}
                        ref={isTarget ? targetRef : undefined}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="relative rounded-xl p-4 border transition-all duration-200"
                        style={{
                          background:   isTarget ? 'var(--cx-accent-wash)' : 'var(--cx-paper)',
                          borderColor:  isTarget ? 'var(--cx-accent-line)'  : 'var(--cx-line)',
                          boxShadow:    isTarget ? '0 2px 16px rgba(122,31,90,0.1)' : 'none',
                        }}
                      >
                        {isTarget && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <div
                              className="inline-flex items-center gap-1 h-4 px-1.5 rounded text-[9.5px] font-bold uppercase tracking-[.12em]"
                              style={{ background: 'var(--cx-accent)', color: '#fff' }}
                            >
                              Cited passage
                            </div>
                          </div>
                        )}
                        <p
                          className="text-[13px] leading-relaxed cx-serif"
                          style={{ color: isTarget ? 'var(--cx-ink)' : 'var(--cx-ink-2)' }}
                        >
                          {chunk.content}
                        </p>
                        {!isTarget && (
                          <div
                            className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl"
                            style={{ background: 'var(--cx-line-2)' }}
                          />
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
