'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Loader2, Check, UploadCloud, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

const STAGES = [
  { key: 'processing', label: 'Parse'   },
  { key: 'embedding',  label: 'Embed'   },
  { key: 'embedded',   label: 'Indexed' },
] as const

type StageName = 'processing' | 'chunking' | 'embedding' | 'embedded'

type QueueItem = {
  id: string
  name: string
  stage: StageName
  pct: number
  label: string
  error?: string
}

function UploadRow({ file }: { file: QueueItem }) {
  // `chunking` is legacy; fold it into the parse stage.
  const stage = file.stage === 'chunking' ? 'processing' : file.stage
  const stageIdx = STAGES.findIndex(s => s.key === stage)
  const isDone   = stage === 'embedded'
  const hasError = !!file.error

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <FileText size={12} style={{ color: hasError ? 'var(--cx-err)' : 'var(--cx-mute-2)' }} className="flex-shrink-0" />
        <div className="min-w-0 flex-1 text-[12px] font-medium truncate" style={{ color: 'var(--cx-ink-2)' }}>
          {file.name}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasError
            ? <AlertCircle size={12} style={{ color: 'var(--cx-err)' }} />
            : isDone
              ? <Check size={12} style={{ color: 'var(--cx-ok)' }} strokeWidth={2.5} />
              : <Loader2 size={11} className="animate-spin" style={{ color: 'var(--cx-accent)' }} />}
          <span className="cx-num text-[10px] w-7 text-right" style={{ color: hasError ? 'var(--cx-err)' : 'var(--cx-mute-2)' }}>
            {hasError ? 'err' : `${Math.round(file.pct)}%`}
          </span>
        </div>
      </div>

      {hasError ? (
        <p className="text-[11px] leading-relaxed px-0.5 mt-1" style={{ color: 'var(--cx-err)' }}>
          {file.error}
        </p>
      ) : (
        <>
          {/* Continuous progress bar */}
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--cx-line)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${isDone ? 100 : Math.min(100, Math.max(4, file.pct))}%`,
                background: isDone ? 'var(--cx-ok)' : 'var(--cx-accent)',
              }}
            />
          </div>
          {/* Stage ticks */}
          <div className="flex items-center gap-4 mt-1.5">
            {STAGES.map((s, i) => {
              const active = i === stageIdx
              const passed = i < stageIdx || isDone
              return (
                <span
                  key={s.key}
                  className="text-[10.5px] font-mono uppercase tracking-[.1em]"
                  style={{
                    color: active ? 'var(--cx-ink-2)' : passed ? 'var(--cx-ok)' : 'var(--cx-mute-2)',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {s.label}
                </span>
              )
            })}
          </div>
        </>
      )}

      {!hasError && file.label && !isDone && (
        <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--cx-mute-2)' }}>
          {file.label}
        </p>
      )}
    </motion.div>
  )
}

export function UploadZoneNew({ workspaceId }: { workspaceId: string }) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [drag, setDrag]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router  = useRouter()

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue(q => q.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  async function pollStatus(id: string, documentId: string) {
    // Ingestion runs in the background (see /api/upload) - parsing alone can
    // take minutes on table-heavy PDFs on a CPU-only host, so this polls
    // rather than holding a request open. ~10 min ceiling before giving up.
    const MAX_POLLS = 200
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const res = await fetch(`/api/documents/${documentId}/status`)
        if (!res.ok) continue
        const { status, statusMessage, chunkCount } = await res.json()

        if (status === 'ready') {
          updateItem(id, { stage: 'embedded', pct: 100, label: `Indexed - ${chunkCount} chunks` })
          setTimeout(() => router.refresh(), 400)
          return
        }
        if (status === 'failed') {
          updateItem(id, { error: statusMessage || 'Processing failed' })
          return
        }
        if (status === 'processing') {
          updateItem(id, { stage: 'processing', pct: 45, label: 'Extracting & embedding… (can take a few minutes)' })
        } else {
          updateItem(id, { stage: 'processing', pct: 12, label: 'Queued…' })
        }
      } catch {
        // transient network hiccup - keep polling
      }
    }
    updateItem(id, { error: 'Taking longer than expected - check the documents list shortly.' })
  }

  async function processFile(file: File) {
    const id = `q-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newItem: QueueItem = { id, name: file.name, stage: 'processing', pct: 5, label: 'Uploading…' }
    setQueue(q => [newItem, ...q].slice(0, 8))

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('workspaceId', workspaceId)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.documentId) {
        updateItem(id, { error: body.error || `Upload failed (${res.status})` })
        return
      }

      updateItem(id, { stage: 'processing', pct: 12, label: 'Queued…' })
      await pollStatus(id, body.documentId)
    } catch (err: any) {
      updateItem(id, { error: err.message ?? 'Network error' })
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    // Process each file sequentially to avoid overwhelming the API
    for (let i = 0; i < files.length; i++) {
      processFile(files[i])
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="cx-panel overflow-hidden flex flex-col h-full">
      <div className="px-4 pt-3.5 pb-2.5">
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--cx-ink)' }}>Upload files</h3>
      </div>

      <div className="px-4 pb-3.5">
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          className="relative rounded-md border border-dashed transition-colors flex flex-col items-center justify-center text-center px-6 py-6 cursor-pointer"
          style={{
            borderColor: drag ? 'var(--cx-accent)' : 'var(--cx-line-2)',
            background:   drag ? 'var(--cx-accent-wash)' : 'var(--cx-paper)',
          }}
        >
          <input
            id="cx-upload-input"
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
            accept=".pdf,.docx,.xlsx"
          />
          <UploadCloud size={18} className="mb-1.5" style={{ color: 'var(--cx-mute-2)' }} />
          <p className="text-[12.5px] font-medium mb-0.5" style={{ color: 'var(--cx-ink)' }}>
            Drop a file or click to browse
          </p>
          <p className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>
            PDF, DOCX, XLSX · up to 50 MB
          </p>
        </div>
      </div>

      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t px-4 py-3 space-y-2.5 overflow-hidden"
            style={{ borderColor: 'var(--cx-line)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium" style={{ color: 'var(--cx-mute-2)' }}>Queue</p>
              <span className="cx-num text-[10.5px]" style={{ color: 'var(--cx-mute-2)' }}>
                {queue.filter(f => f.stage !== 'embedded' && !f.error).length} active
                {' · '}
                {queue.filter(f => f.stage === 'embedded').length} done
              </span>
            </div>
            <AnimatePresence initial={false}>
              {queue.map(f => <UploadRow key={f.id} file={f} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
