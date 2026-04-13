'use client'

import { useState } from 'react'
import { UploadCloud, Loader2, CheckCircle } from 'lucide-react'
import { uploadDocument } from '@/app/actions'

const ACCEPTED = ".pdf,.docx,.doc,.txt,.md,.csv"
const ACCEPTED_LABEL = "PDF, DOCX, TXT, MD, CSV"

export function UploadZone({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('uploading')
    setErrorMsg('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspaceId', workspaceId)

    const result = await uploadDocument(formData)

    if (result?.error) {
      setErrorMsg(result.error)
      setStatus('error')
    } else {
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    }

    e.target.value = ''
  }

  const uploading = status === 'uploading'

  return (
    <div className="relative h-full min-h-[200px] rounded-2xl border-2 border-dashed border-zinc-200/80 bg-white/30 hover:bg-white/50 hover:border-zinc-300 transition-all duration-300 flex flex-col items-center justify-center text-center px-6 py-10 group">
      <input
        type="file"
        accept={ACCEPTED}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        disabled={uploading}
      />

      <div className="size-14 rounded-2xl bg-white border border-zinc-200/80 flex items-center justify-center mb-5 shadow-sm group-hover:border-fuchsia-200 group-hover:bg-fuchsia-50 transition-all duration-300">
        {uploading ? (
          <Loader2 className="h-6 w-6 text-fuchsia-500 animate-spin" />
        ) : status === 'done' ? (
          <CheckCircle className="h-6 w-6 text-emerald-500" />
        ) : (
          <UploadCloud className="h-6 w-6 text-zinc-400 group-hover:text-fuchsia-500 transition-colors duration-300" />
        )}
      </div>

      <p className="text-sm font-bold text-zinc-900 mb-1">
        {uploading
          ? 'Uploading & indexing...'
          : status === 'done'
          ? 'Indexed successfully!'
          : 'Drop a file or click to browse'}
      </p>

      <p className="text-xs text-zinc-400 max-w-[260px] leading-relaxed">
        {status === 'error' ? errorMsg : `Supports ${ACCEPTED_LABEL}`}
      </p>

      {status === 'error' && (
        <p className="text-xs text-red-500 mt-2 font-medium">{errorMsg}</p>
      )}

      <button
        type="button"
        disabled={uploading}
        className="relative z-20 mt-5 h-8 px-4 rounded-full bg-zinc-950 text-white text-[12.5px] font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors pointer-events-auto"
        onClick={() => (document.querySelector('input[type=file]') as HTMLInputElement)?.click()}
      >
        {uploading ? 'Processing...' : 'Select File'}
      </button>
    </div>
  )
}
