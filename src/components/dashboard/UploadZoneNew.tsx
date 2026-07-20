'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Loader2, Check, UploadCloud, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

const STAGES = [
  { key: 'processing', label: 'Process' },
  { key: 'chunking',   label: 'Chunk'   },
  { key: 'embedding',  label: 'Embed'   },
  { key: 'embedded',   label: 'Indexed' },
] as const

type StageName = typeof STAGES[number]['key']

type QueueItem = {
  id: string
  name: string
  stage: StageName
  pct: number
  label: string
  error?: string
}

function UploadRow({ file }: { file: QueueItem }) {
  const stageIdx = STAGES.findIndex(s => s.key === file.stage)
  const isDone   = file.stage === 'embedded'
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
        <p className="text-[10.5px] leading-relaxed px-0.5 mt-1" style={{ color: 'var(--cx-err)' }}>
          {file.error}
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-1">
          {STAGES.map((s, i) => {
            const isActive = i === stageIdx
            const done = i < stageIdx || isDone
            const fillWidth = done ? '100%'
              : isActive ? `${Math.min(100, Math.max(0, ((file.pct - i * 25) / 25) * 100))}%`
              : '0%'
            return (
              <div key={s.key} className="flex flex-col gap-1">
                <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'var(--cx-line)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: fillWidth, background: done ? 'var(--cx-ok)' : 'var(--cx-accent)' }}
                  />
                </div>
                <span
                  className="text-[9.5px] font-mono uppercase tracking-[.1em]"
                  style={{
                    color: isActive ? 'var(--cx-ink-2)' : done ? 'var(--cx-mute-1)' : 'var(--cx-mute-2)',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
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

  async function processFile(file: File) {
    const id = `q-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newItem: QueueItem = { id, name: file.name, stage: 'processing', pct: 2, label: 'Starting…' }
    setQueue(q => [newItem, ...q].slice(0, 8))

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('workspaceId', workspaceId)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok || !res.body) {
        updateItem(id, { error: `Upload failed (${res.status})` })
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const dataLine = line.trim()
          if (!dataLine.startsWith('data:')) continue
          try {
            const event = JSON.parse(dataLine.slice(5).trim())
            if (event.error) {
              updateItem(id, { error: event.error })
            } else if (event.stage) {
              updateItem(id, {
                stage: event.stage as StageName,
                pct:   event.pct ?? 0,
                label: event.label ?? '',
              })
              if (event.stage === 'embedded') {
                // Refresh dashboard after a tick so Supabase has the row
                setTimeout(() => router.refresh(), 400)
              }
            }
          } catch {}
        }
      }
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="cx-panel cx-panel-hover overflow-hidden flex flex-col h-full"
    >
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div className="cx-icon-chip cx-icon-chip-sm">
          <UploadCloud size={15} />
        </div>
        <div>
          <p className="cx-rule-label mb-1">Ingest</p>
          <h3 className="text-[14.5px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>
            Add to knowledge base
          </h3>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          className="relative rounded-xl border border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center px-6 py-7 cursor-pointer"
          style={{
            borderColor: drag ? 'var(--cx-accent)' : 'var(--cx-line-2)',
            background:   drag ? 'var(--cx-accent-wash)' : 'var(--cx-paper)',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
            accept=".pdf,.docx,.doc,.txt,.md,.csv"
          />
          <UploadCloud size={20} className="mb-2" style={{ color: 'var(--cx-mute-1)' }} />
          <p className="text-[12.5px] font-medium mb-0.5" style={{ color: 'var(--cx-ink)' }}>
            Drop a file or click to browse
          </p>
          <p className="text-[10.5px] font-mono" style={{ color: 'var(--cx-mute-2)' }}>
            PDF · DOCX · TXT · MD · CSV · up to 50 MB
          </p>
        </div>
      </div>

      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t px-5 py-4 space-y-3 overflow-hidden"
            style={{ borderColor: 'var(--cx-line)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="cx-rule-label">Queue</p>
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
    </motion.div>
  )
}
