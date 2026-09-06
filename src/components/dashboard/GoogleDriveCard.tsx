'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, HardDrive, HelpCircle, Link2, RefreshCw, Unlink } from 'lucide-react'

const FRIENDLY_ERR: Record<string, string> = {
  'state expired': 'The connection window timed out. Please try again.',
  'bad state signature': 'Security check failed. Please start the connection again.',
  'no refresh_token returned': 'Google didn’t return a refresh token. Remove Cortex at myaccount.google.com/permissions, then reconnect.',
}
function friendly(msg: string) {
  const key = Object.keys(FRIENDLY_ERR).find(k => msg.toLowerCase().includes(k))
  return key ? FRIENDLY_ERR[key] : msg
}

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
    if (p.get('gdrive') === 'error') setError(friendly(p.get('reason') || 'Connection failed'))
    if (p.get('gdrive')) window.history.replaceState({}, '', window.location.pathname)
  }, [refresh])

  async function disconnect() {
    setError(null)
    await fetch('/api/connectors/google-drive/disconnect', { method: 'POST' })
    setReport(null)
    setFolderId('')
    refresh()
  }

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
      if (!r.ok) setError(friendly(b.detail || b.error || 'Sync failed'))
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
        Give Cortex read-only access to one Drive folder. Every PDF, DOCX and XLSX
        inside it becomes searchable in chat. Edited files are picked up on the next sync.
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--cx-ok)' }}>
              <CheckCircle2 size={14} /> Connected{status.email ? ` as ${status.email}` : ''}
            </div>
            <button
              onClick={disconnect}
              className="inline-flex items-center gap-1 text-[12px] font-medium hover:underline"
              style={{ color: 'var(--cx-err)' }}
            >
              <Unlink size={12} /> Disconnect
            </button>
          </div>
          {status.last_synced_at && (
            <p className="text-[12px]" style={{ color: 'var(--cx-ink)', opacity: 0.6 }}>
              Last sync {new Date(status.last_synced_at).toLocaleString()} ·{' '}
              {status.last_status ?? '-'}
              {status.folder_id ? ` · folder ${status.folder_id}` : ''}
            </p>
          )}
          <div>
            <label className="flex items-center gap-1.5 text-[12px] mb-1" style={{ color: 'var(--cx-ink)', opacity: 0.7 }}>
              Drive folder ID
              <a
                href="https://support.google.com/drive/answer/2375091"
                target="_blank"
                rel="noopener noreferrer"
                title="Open the folder in Google Drive — the ID is the part of the URL after /folders/"
              >
                <HelpCircle size={12} />
              </a>
            </label>
            <div className="flex gap-2">
              <input
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                placeholder="1AbC…xyz  (from drive.google.com/…/folders/‹ID›)"
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
            {syncing && (
              <p className="text-[11.5px] mt-1.5" style={{ color: 'var(--cx-ink)', opacity: 0.55 }}>
                Parsing and embedding files — this can take a few minutes for large folders.
              </p>
            )}
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
