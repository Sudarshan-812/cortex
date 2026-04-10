'use client'

import { useState } from 'react'
import { FileText, Clock, Trash2, Loader2, Search, X } from 'lucide-react'
import Link from 'next/link'
import { deleteDocument } from '@/app/actions'

type Doc = {
  id: string
  name: string
  size_bytes: number
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function DocumentList({ documents: initial }: { documents: Doc[] }) {
  const [docs, setDocs] = useState<Doc[]>(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    setConfirmId(null)
    // Optimistic remove
    setDocs(prev => prev.filter(d => d.id !== id))
    const result = await deleteDocument(id)
    if (result?.error) {
      // Restore on failure
      setDocs(initial)
    }
    setDeletingId(null)
  }

  if (docs.length === 0) return null

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-zinc-200/60 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-bold text-zinc-950">Data Repository</h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">
            {docs.length} file{docs.length !== 1 ? 's' : ''} indexed
          </p>
        </div>
        <Link
          href="/chat"
          className="h-8 px-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors"
        >
          <Search className="size-3.5" />
          Query All
        </Link>
      </div>

      {/* Document rows */}
      <div className="divide-y divide-zinc-100">
        {docs.map(doc => {
          const isDeleting = deletingId === doc.id
          const isConfirming = confirmId === doc.id

          return (
            <div
              key={doc.id}
              className={`flex items-center justify-between px-6 py-3.5 transition-colors group ${isDeleting ? 'opacity-40' : 'hover:bg-zinc-50/60'}`}
            >
              {/* Left: icon + info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="size-9 rounded-xl bg-white border border-zinc-200/60 flex items-center justify-center flex-shrink-0 group-hover:border-fuchsia-200 group-hover:bg-fuchsia-50 transition-all">
                  <FileText className="size-4 text-zinc-400 group-hover:text-fuchsia-500 transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-zinc-900 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11.5px] text-zinc-400">{formatBytes(doc.size_bytes)}</span>
                    <span className="size-0.5 rounded-full bg-zinc-300" />
                    <Clock className="size-2.5 text-zinc-300" />
                    <span className="text-[11.5px] text-zinc-400">{timeAgo(doc.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Right: badge + delete */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {!isConfirming && (
                  <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                    Indexed
                  </span>
                )}

                {isConfirming ? (
                  /* Inline confirm */
                  <div className="flex items-center gap-1 bg-red-50 border border-red-100 rounded-full px-3 py-1">
                    <span className="text-[11px] text-red-500 font-medium">Delete?</span>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 px-1 transition-colors"
                    >
                      Yes
                    </button>
                    <span className="text-red-200">·</span>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 px-1 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : isDeleting ? (
                  <div className="size-7 flex items-center justify-center">
                    <Loader2 className="size-3.5 animate-spin text-zinc-400" />
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(doc.id)}
                    title="Delete document"
                    className="size-7 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
