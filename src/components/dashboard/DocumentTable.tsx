'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2, Trash2, Info, HardDrive, ExternalLink } from 'lucide-react'
import { deleteDocument } from '@/app/actions'

type Doc = {
  id: string
  name: string
  size_bytes: number
  created_at: string
  summary?: string | null
  topics?: string[] | null
  source_type?: string | null
  external_id?: string | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function SummaryPopover({ summary }: { summary: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setShow(v => !v)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label="Show document summary"
        aria-expanded={show}
        className="size-6 -m-1 rounded flex items-center justify-center"
        style={{ color: 'var(--cx-mute-2)' }}
      >
        <Info size={11} />
      </button>
      {show && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[260px] p-3 z-50 rounded-lg border pointer-events-none"
          style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)' }}
        >
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--cx-mute-2)' }}>Summary</p>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--cx-ink-2)' }}>{summary}</p>
        </div>
      )}
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
  const [, forceTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

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

  const cols = 'minmax(0,2fr) minmax(0,1.2fr) 72px 64px 96px'

  return (
    <div id="documents" className="cx-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--cx-line)' }}>
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--cx-ink)' }}>Documents</h3>
        <span className="text-[12px]" style={{ color: 'var(--cx-mute-2)' }}>
          {docs.length} file{docs.length !== 1 ? 's' : ''} · <span className="cx-num">{storageMB}</span> MB
        </span>
      </div>

      <div className="overflow-x-auto cx-scroll-thin">
        <div className="min-w-[560px]">
          <div
            className="grid gap-3 px-4 py-2 text-[11px] font-medium border-b"
            style={{ gridTemplateColumns: cols, color: 'var(--cx-mute-2)', background: 'var(--cx-paper)', borderColor: 'var(--cx-line)' }}
          >
            <span>Name</span>
            <span>Topics</span>
            <span>Size</span>
            <span>Added</span>
            <span>Status</span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--cx-line)' }}>
            {docs.map(doc => {
              const isDeleting   = deletingId === doc.id
              const isConfirming = confirmId  === doc.id
              const topics = Array.isArray(doc.topics) ? doc.topics : []
              const isDrive = doc.source_type === 'gdrive' && !!doc.external_id

              return (
                <div
                  key={doc.id}
                  className="grid gap-3 items-center px-4 py-2.5 group transition-colors"
                  style={{ gridTemplateColumns: cols, opacity: isDeleting ? 0.4 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    {isDrive
                      ? <HardDrive size={13} className="flex-shrink-0" style={{ color: 'var(--cx-accent)' }} />
                      : <FileText size={13} className="flex-shrink-0" style={{ color: 'var(--cx-mute-2)' }} />}
                    {isDrive ? (
                      <a
                        href={`https://drive.google.com/file/d/${doc.external_id}/view`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[12.5px] truncate inline-flex items-center gap-1 hover:underline"
                        style={{ color: 'var(--cx-ink)' }}
                        title="Open in Google Drive"
                      >
                        <span className="truncate">{doc.name}</span>
                        <ExternalLink size={9} className="flex-shrink-0" style={{ color: 'var(--cx-mute-2)' }} />
                      </a>
                    ) : (
                      <span className="text-[12.5px] truncate" style={{ color: 'var(--cx-ink)' }}>{doc.name}</span>
                    )}
                    {doc.summary && <SummaryPopover summary={doc.summary} />}
                  </div>

                  {/* Topics */}
                  <span className="text-[12px] truncate" style={{ color: 'var(--cx-mute-1)' }}>
                    {topics.length > 0 ? topics.slice(0, 3).join(', ') : <span style={{ color: 'var(--cx-mute-2)' }}>—</span>}
                  </span>

                  {/* Size */}
                  <span className="cx-num text-[11.5px]" style={{ color: 'var(--cx-mute-1)' }}>{formatBytes(doc.size_bytes)}</span>

                  {/* Added */}
                  <span className="cx-num text-[11.5px]" style={{ color: 'var(--cx-mute-1)' }}>{timeAgo(doc.created_at)}</span>

                  {/* Status / delete */}
                  <div className="flex items-center gap-2 justify-between">
                    {isConfirming ? (
                      <span className="text-[11px] whitespace-nowrap">
                        <button onClick={() => handleDelete(doc.id)} className="font-semibold" style={{ color: 'var(--cx-err)' }}>Delete</button>
                        <span style={{ color: 'var(--cx-line-2)' }}> · </span>
                        <button onClick={() => setConfirmId(null)} style={{ color: 'var(--cx-mute-2)' }}>Cancel</button>
                      </span>
                    ) : isDeleting ? (
                      <Loader2 size={12} className="animate-spin" style={{ color: 'var(--cx-mute-2)' }} />
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--cx-mute-1)' }}>
                          <span className="cx-dot" style={{ background: doc.summary ? 'var(--cx-ok)' : 'var(--cx-mute-2)' }} />
                          {doc.summary ? 'Analysed' : 'Indexed'}
                        </span>
                        <button
                          onClick={() => setConfirmId(doc.id)}
                          aria-label={`Delete ${doc.name}`}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 size-6 rounded flex items-center justify-center transition-opacity hover:bg-[var(--cx-paper-2)]"
                          style={{ color: 'var(--cx-mute-2)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
