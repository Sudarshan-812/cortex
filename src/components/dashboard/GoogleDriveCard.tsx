'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, HardDrive, Link2, RefreshCw } from 'lucide-react'

type Status = {
  connected: boolean
  email?: string | null
  folder_id?: string | null
  last_synced_at?: string | null
  last_status?: string | null
}
type SyncReport = { scanned: number; synced: number; skipped: number; failed: number }

const btn =
  'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors disabled:opacity-50'

export function GoogleDriveCard({ workspaceId }: { workspaceId?: string }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [folderId, setFolderId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/connectors/google-drive/status')
      setStatus(await r.json())
    } catch {
      setStatus({ connected: false })
    }
  }, [])

  useEffect(() => {
    refresh()
    const p = new URLSearchParams(window.location.search)
    if (p.get('gdrive') === 'error') setError(p.get('reason') || 'Connection failed')
    if (p.get('gdrive')) window.history.replaceState({}, '', window.location.pathname)
  }, [refresh])

  async function connect() {
    if (!workspaceId) return
    setError(null)
    const r = await fetch(`/api/connectors/google-drive/authorize?workspaceId=${workspaceId}`)
    const b = await r.json().catch(() => ({}))
    if (b.url) window.location.href = b.url
    else setError(b.error || b.detail || 'Could not start Google authorization')
  }

  async function sync() {
    if (!folderId.trim()) return
    setSyncing(true)
    setError(null)
    setReport(null)
    try {
      const r = await fetch('/api/connectors/google-drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: folderId.trim() }),
      })
      const b = await r.json().catch(() => ({}))
      if (!r.ok) setError(b.detail || b.error || 'Sync failed')
      else {
        setReport(b)
        refresh()
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="cx-panel p-5 mb-4 max-w-2xl"
    >
      <div className="flex items-center gap-3 mb-1">
        <HardDrive size={18} style={{ color: 'var(--cx-accent)' }} />
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--cx-ink)' }}>
          Google Drive
        </h3>
      </div>
      <p className="text-[13px] mb-4" style={{ color: 'var(--cx-ink)', opacity: 0.65 }}>
        Sync a Drive folder into this workspace. PDF, DOCX and XLSX files are parsed,
        chunked and embedded; edited files re-sync on the next run.
      </p>

      {status == null ? (
        <p className="text-[13px]" style={{ color: 'var(--cx-ink)', opacity: 0.6 }}>
          Checking…
        </p>
      ) : !status.connected ? (
        <button
          onClick={connect}
          disabled={!workspaceId}
          className={btn}
          style={{
            background: 'var(--cx-accent-wash)',
            color: 'var(--cx-accent)',
            borderColor: 'var(--cx-accent-line)',
          }}
        >
          <Link2 size={14} /> Connect Google Drive
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--cx-ok)' }}>
            <CheckCircle2 size={14} /> Connected{status.email ? ` as ${status.email}` : ''}
          </div>
          {status.last_synced_at && (
            <p className="text-[12px]" style={{ color: 'var(--cx-ink)', opacity: 0.6 }}>
              Last sync {new Date(status.last_synced_at).toLocaleString()} ·{' '}
              {status.last_status ?? '—'}
              {status.folder_id ? ` · folder ${status.folder_id}` : ''}
            </p>
          )}
          <div className="flex gap-2">
            <input
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Drive folder ID"
              className="flex-1 px-3 py-2 rounded-lg text-[13px] border bg-transparent outline-none"
              style={{ borderColor: 'var(--cx-line)', color: 'var(--cx-ink)' }}
            />
            <button
              onClick={sync}
              disabled={syncing || !folderId.trim()}
              className={btn}
              style={{
                background: 'var(--cx-accent-wash)',
                color: 'var(--cx-accent)',
                borderColor: 'var(--cx-accent-line)',
              }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
          {report && (
            <p className="text-[12px]" style={{ color: 'var(--cx-ink)', opacity: 0.6 }}>
              Scanned {report.scanned} · synced {report.synced} · skipped {report.skipped} ·
              failed {report.failed}
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-2 mt-3 text-[12px]"
          style={{ color: 'var(--cx-err)' }}
        >
          <AlertCircle size={13} /> {error}
        </div>
      )}
    </motion.div>
  )
}
