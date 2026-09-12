'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2, Trash2, Info, HardDrive, ExternalLink } from 'lucide-react'
import { deleteDocument } from '@/app/actions'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'

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

function timeAgo(dateStr: string, now: number) {
  const mins = Math.floor((now - new Date(dateStr).getTime()) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

// Date.now() read directly in render diverges between the server-rendered
// pass and client hydration whenever real time crosses a minute/hour
// boundary in between - a classic hydration mismatch. Deferring "now" to a
// post-mount effect makes the first client render match the server exactly;
// the periodic tick keeps "time ago" labels honest for the rest of the
// session without ever affecting the initial render.
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function SummaryPopover({ summary }: { summary: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label="Show document summary"
          className="size-6 -m-1 rounded flex items-center justify-center"
          style={{ color: 'var(--cx-mute-2)' }}
        >
          <Info size={11} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="w-[260px] p-3 text-left">

        <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--cx-mute-2)' }}>Summary</p>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--cx-ink-2)' }}>{summary}</p>
      </TooltipContent>
    </Tooltip>
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
  const now = useNow()

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
    <div id="documents" className="cx-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--cx-line)' }}>
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--cx-ink)' }}>Documents</h3>
        <span className="text-[12px]" style={{ color: 'var(--cx-mute-2)' }}>
          {docs.length} file{docs.length !== 1 ? 's' : ''} · <span className="cx-num">{storageMB}</span> MB
        </span>
      </div>

      <div className="overflow-x-auto cx-scroll-thin">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent" style={{ borderColor: 'var(--cx-line)' }}>
              <TableHead className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>Name</TableHead>
              <TableHead className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>Topics</TableHead>
              <TableHead className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>Size</TableHead>
              <TableHead className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>Added</TableHead>
              <TableHead className="text-[11px] text-right" style={{ color: 'var(--cx-mute-2)' }}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc, i) => {
              const isDeleting   = deletingId === doc.id
              const isConfirming = confirmId  === doc.id
              const topics = Array.isArray(doc.topics) ? doc.topics : []
              const isDrive = doc.source_type === 'gdrive' && !!doc.external_id

              return (
                <TableRow
                  key={doc.id}
                  className={cn('group transition-colors', i % 2 === 1 && 'bg-[var(--cx-paper)]/60')}
                  style={{ borderColor: 'var(--cx-line)', opacity: isDeleting ? 0.4 : 1 }}
                >
                  {/* Name */}
                  <TableCell className="whitespace-normal">
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
                  </TableCell>

                  {/* Topics */}
                  <TableCell className="max-w-[220px] truncate text-[12px]" style={{ color: 'var(--cx-mute-1)' }}>
                    {topics.length > 0 ? topics.slice(0, 3).join(', ') : <span style={{ color: 'var(--cx-mute-2)' }}>—</span>}
                  </TableCell>

                  {/* Size */}
                  <TableCell className="cx-num text-[11.5px]" style={{ color: 'var(--cx-mute-1)' }}>{formatBytes(doc.size_bytes)}</TableCell>

                  {/* Added */}
                  <TableCell className="cx-num text-[11.5px]" style={{ color: 'var(--cx-mute-1)' }}>
                    {now === null ? ' ' : timeAgo(doc.created_at, now)}
                  </TableCell>

                  {/* Status / delete */}
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
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
                          <span className="inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap" style={{ color: 'var(--cx-mute-1)' }}>
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
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
