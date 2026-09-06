'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Loader2, Trash2, Info } from 'lucide-react'
import { deleteDocument } from '@/app/actions'

type Doc = {
  id: string
  name: string
  size_bytes: number
  created_at: string
  summary?: string | null
  topics?: string[] | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function TopicTag({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium border whitespace-nowrap"
      style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)', color: 'var(--cx-accent)' }}
    >
      {label}
    </span>
  )
}

function SummaryPopover({ summary }: { summary: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="size-5 rounded flex items-center justify-center transition-colors"
        style={{ color: 'var(--cx-mute-2)' }}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        <Info size={12} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[260px] cx-panel p-3 z-50 pointer-events-none"
          >
            <p className="cx-rule-label mb-1.5">Summary</p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--cx-ink-2)' }}>{summary}</p>
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 size-2 rotate-45 border-r border-b"
              style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)', marginTop: -5 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DocumentTable({
  documents: initial,
  storageMB,
}: {
  documents: Doc[]
  storageMB: number
}) {
  const [docs,       setDocs]       = useState(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId,  setConfirmId]  = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    setConfirmId(null)
    const snapshot = [...docs]
    setDocs(prev => prev.filter(d => d.id !== id))
    const result = await deleteDocument(id)
    if (result?.error) setDocs(snapshot)
    setDeletingId(null)
  }

  if (docs.length === 0) return null

  return (
    <motion.div
      id="documents"
      className="cx-panel overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: 'var(--cx-line)' }}
      >
        <div className="cx-icon-chip cx-icon-chip-sm">
          <FileText size={15} />
        </div>
        <div>
          <p className="cx-rule-label mb-1">Documents</p>
          <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>
            {docs.length} file{docs.length !== 1 ? 's' : ''} ·{' '}
            <span className="cx-num" style={{ color: 'var(--cx-mute-1)' }}>{storageMB} MB</span>{' '}indexed
          </h3>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid gap-4 px-6 py-2.5 cx-rule-label border-b"
        style={{
          gridTemplateColumns: '2fr 1fr 80px 100px 120px',
          background: 'var(--cx-paper)',
          borderColor: 'var(--cx-line)',
        }}
      >
        <span>Name</span>
        <span>Topics</span>
        <span>Size</span>
        <span>Added</span>
        <span>Status</span>
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: 'var(--cx-line)' }}>
        <AnimatePresence initial={false}>
          {docs.map((doc, idx) => {
            const isDeleting   = deletingId === doc.id
            const isConfirming = confirmId  === doc.id
            const topics = Array.isArray(doc.topics) ? doc.topics : []

            return (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isDeleting ? 0.3 : 1, y: 0 }}
                exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden', transition: { duration: 0.22 } }}
                transition={{ duration: 0.3, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                className="grid gap-4 items-center px-6 py-3.5 group cursor-default transition-colors duration-150"
                style={{ gridTemplateColumns: '2fr 1fr 80px 100px 120px' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                {/* Name + summary icon */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={14} className="flex-shrink-0" style={{ color: 'var(--cx-mute-2)' }} />
                  <span className="text-[13px] font-medium truncate" style={{ color: 'var(--cx-ink)' }}>
                    {doc.name}
                  </span>
                  {doc.summary && <SummaryPopover summary={doc.summary} />}
                </div>

                {/* Topics */}
                <div className="flex items-center gap-1 overflow-hidden">
                  {topics.length > 0 ? (
                    <>
                      {topics.slice(0, 2).map(t => <TopicTag key={t} label={t} />)}
                      {topics.length > 2 && (
                        <span className="text-[10px] cx-num flex-shrink-0" style={{ color: 'var(--cx-mute-2)' }}>
                          +{topics.length - 2}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>-</span>
                  )}
                </div>

                {/* Size */}
                <span className="cx-num text-[11.5px]" style={{ color: 'var(--cx-mute-1)' }}>
                  {formatBytes(doc.size_bytes)}
                </span>

                {/* Added */}
                <span className="cx-num text-[11.5px]" style={{ color: 'var(--cx-mute-1)' }}>
                  {timeAgo(doc.created_at)}
                </span>

                {/* Status / actions */}
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    {isConfirming ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1.5"
                      >
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-[11px] font-bold"
                          style={{ color: 'var(--cx-err)' }}
                        >
                          Delete
                        </button>
                        <span style={{ color: 'var(--cx-line-2)' }}>·</span>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-[11px] font-medium"
                          style={{ color: 'var(--cx-mute-2)' }}
                        >
                          Cancel
                        </button>
                      </motion.div>
                    ) : isDeleting ? (
                      <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Loader2 size={12} className="animate-spin" style={{ color: 'var(--cx-mute-2)' }} />
                      </motion.span>
                    ) : (
                      <motion.div
                        key="actions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[.14em] rounded-full px-2 py-0.5 border"
                          style={{ color: 'var(--cx-ok)', background: 'var(--cx-ok-wash)', borderColor: 'rgba(60,110,71,0.2)' }}
                        >
                          {doc.summary ? 'Analysed' : 'Embedded'}
                        </span>
                        <button
                          onClick={() => setConfirmId(doc.id)}
                          className="opacity-0 group-hover:opacity-100 size-6 rounded flex items-center justify-center transition-all"
                          style={{ color: 'var(--cx-mute-2)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cx-paper-2)'; e.currentTarget.style.color = 'var(--cx-err)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--cx-mute-2)' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
