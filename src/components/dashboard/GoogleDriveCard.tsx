'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, Check, CheckCircle2, ChevronRight, FolderClosed, HardDrive,
  Link2, Loader2, RefreshCw, Unlink,
} from 'lucide-react'

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
  workspace_id?: string | null
  folder_id?: string | null
  last_synced_at?: string | null
  last_status?: string | null
  document_count?: number
}
type Folder = { id: string; name: string }
type SyncReport = { scanned: number; synced: number; skipped: number; failed: number; removed?: number }

const btn =
  'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors disabled:opacity-50'
const accentBtn = { background: 'var(--cx-accent-wash)', color: 'var(--cx-accent)', borderColor: 'var(--cx-accent-line)' }

function timeAgo(iso?: string | null) {
  if (!iso) return null
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function GoogleDriveCard({
  workspaceId, workspaceName,
}: { workspaceId?: string; workspaceName?: string }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  // folder browser
  const [browsing, setBrowsing] = useState(false)
  const [crumbs, setCrumbs] = useState<Folder[]>([{ id: 'root', name: 'My Drive' }])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)

  // advanced: paste an id
  const [manualId, setManualId] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Poll status while a sync is running so counts / "last sync" stay live.
  useEffect(() => {
    if (syncing && !pollRef.current) {
      pollRef.current = setInterval(refresh, 4000)
    }
    if (!syncing && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [syncing, refresh])

  async function connect() {
    if (!workspaceId) return
    setError(null)
    const r = await fetch(`/api/connectors/google-drive/authorize?workspaceId=${workspaceId}`)
    const b = await r.json().catch(() => ({}))
    if (b.url) window.location.href = b.url
    else setError(b.error || b.detail || 'Could not start Google authorization')
  }

  async function disconnect() {
    setError(null)
    await fetch('/api/connectors/google-drive/disconnect', { method: 'POST' })
    setReport(null); setBrowsing(false)
    setCrumbs([{ id: 'root', name: 'My Drive' }])
    refresh()
  }

  const loadFolders = useCallback(async (parent: string) => {
    setLoadingFolders(true); setError(null)
    try {
      const r = await fetch(`/api/connectors/google-drive/folders?parent=${encodeURIComponent(parent)}`)
      const b = await r.json().catch(() => ({}))
      if (!r.ok) { setError(friendly(b.detail || b.error || 'Could not list folders')); setFolders([]) }
      else setFolders(b.folders ?? [])
    } finally {
      setLoadingFolders(false)
    }
  }, [])

  function openBrowser() {
    setBrowsing(true)
    setCrumbs([{ id: 'root', name: 'My Drive' }])
    loadFolders('root')
  }
  function drillInto(f: Folder) {
    setCrumbs(c => [...c, f]); loadFolders(f.id)
  }
  function jumpTo(i: number) {
    setCrumbs(c => c.slice(0, i + 1)); loadFolders(crumbs[i].id)
  }

  async function sync(folderId: string) {
    if (!folderId.trim()) return
    setSyncing(true); setError(null); setReport(null); setBrowsing(false)
    try {
      const r = await fetch('/api/connectors/google-drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: folderId.trim() }),
      })
      const b = await r.json().catch(() => ({}))
      if (!r.ok) setError(friendly(b.detail || b.error || 'Sync failed'))
      else setReport(b)
    } finally {
      setSyncing(false)
      setManualId('')
      refresh()
    }
  }

  const connected = status?.connected
  const hasFolder = !!status?.folder_id
  const lastSync = timeAgo(status?.last_synced_at)

  return (
    <div id="google-drive" className="cx-panel p-4 mb-5 max-w-2xl scroll-mt-24">
      <div className="flex items-center gap-2 mb-1">
        <HardDrive size={15} style={{ color: 'var(--cx-accent)' }} />
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--cx-ink)' }}>
          Google Drive
        </h3>
      </div>
      <p className="text-[12.5px] mb-3.5" style={{ color: 'var(--cx-mute-1)' }}>
        Give Cortex read-only access to one Drive folder. Every PDF, DOCX and XLSX
        inside it becomes searchable in chat. Edited files are picked up on the next sync.
      </p>

      {status == null ? (
        <p className="text-[13px]" style={{ color: 'var(--cx-ink)', opacity: 0.6 }}>Checking…</p>
      ) : !connected ? (
        <button onClick={connect} disabled={!workspaceId} className={btn} style={accentBtn}>
          <Link2 size={14} /> Connect Google Drive
        </button>
      ) : (
        <div className="space-y-3">
          {/* connected line */}
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

          {workspaceName && (
            <p className="text-[12px]" style={{ color: 'var(--cx-ink)', opacity: 0.6 }}>
              Syncing into workspace <span className="font-medium" style={{ opacity: 1 }}>{workspaceName}</span>
            </p>
          )}

          {/* synced folder summary */}
          {hasFolder && (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
              style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-paper)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderClosed size={14} style={{ color: 'var(--cx-accent)' }} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium truncate" style={{ color: 'var(--cx-ink)' }}>
                    Folder <span className="cx-num" style={{ opacity: 0.7 }}>{status.folder_id}</span>
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--cx-mute-1)' }}>
                    {syncing
                      ? 'Syncing…'
                      : <>
                          <span className="cx-num">{status.document_count ?? 0}</span> file
                          {(status.document_count ?? 0) !== 1 ? 's' : ''} indexed
                          {lastSync ? ` · synced ${lastSync}` : ''}
                          {status.last_status && status.last_status !== 'ok' ? ` · ${status.last_status}` : ''}
                        </>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => sync(status.folder_id!)}
                disabled={syncing}
                className={btn}
                style={accentBtn}
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Re-sync'}
              </button>
            </div>
          )}

          {/* folder browser */}
          {!browsing ? (
            <button
              onClick={openBrowser}
              disabled={syncing}
              className="text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:underline"
              style={{ color: 'var(--cx-accent)' }}
            >
              <FolderClosed size={13} />
              {hasFolder ? 'Choose a different folder' : 'Choose a folder to sync'}
            </button>
          ) : (
            <div className="rounded-lg border" style={{ borderColor: 'var(--cx-line)' }}>
              {/* breadcrumbs */}
              <div className="flex items-center gap-1 flex-wrap px-3 py-2 border-b text-[12px]"
                style={{ borderColor: 'var(--cx-line)', color: 'var(--cx-mute-1)' }}>
                {crumbs.map((c, i) => (
                  <span key={c.id} className="inline-flex items-center gap-1">
                    {i > 0 && <ChevronRight size={11} style={{ color: 'var(--cx-mute-2)' }} />}
                    <button
                      onClick={() => jumpTo(i)}
                      className="hover:underline"
                      style={{ color: i === crumbs.length - 1 ? 'var(--cx-ink)' : 'var(--cx-mute-1)', fontWeight: i === crumbs.length - 1 ? 600 : 400 }}
                    >
                      {c.name}
                    </button>
                  </span>
                ))}
              </div>
              {/* list */}
              <div className="max-h-[220px] overflow-y-auto cx-scroll-thin">
                {loadingFolders ? (
                  <div className="px-3 py-4 flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--cx-mute-1)' }}>
                    <Loader2 size={13} className="animate-spin" /> Loading folders…
                  </div>
                ) : folders.length === 0 ? (
                  <p className="px-3 py-4 text-[12.5px]" style={{ color: 'var(--cx-mute-2)' }}>
                    No sub-folders here. Sync this folder to include its files.
                  </p>
                ) : (
                  folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => drillInto(f)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12.5px] border-b last:border-b-0 hover:bg-[var(--cx-paper-2)]"
                      style={{ borderColor: 'var(--cx-line)', color: 'var(--cx-ink)' }}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <FolderClosed size={13} style={{ color: 'var(--cx-mute-2)' }} className="flex-shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <ChevronRight size={13} style={{ color: 'var(--cx-mute-2)' }} className="flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
              {/* actions */}
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t" style={{ borderColor: 'var(--cx-line)' }}>
                <button
                  onClick={() => setBrowsing(false)}
                  className="text-[12.5px] font-medium"
                  style={{ color: 'var(--cx-mute-1)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => sync(crumbs[crumbs.length - 1].id)}
                  disabled={syncing || crumbs.length === 1}
                  className={btn}
                  style={accentBtn}
                  title={crumbs.length === 1 ? 'Pick a folder inside My Drive first' : undefined}
                >
                  <Check size={13} />
                  Sync “{crumbs[crumbs.length - 1].name}”
                </button>
              </div>
            </div>
          )}

          {report && (
            <p className="text-[12px]" style={{ color: 'var(--cx-ink)', opacity: 0.6 }}>
              Scanned {report.scanned} · synced {report.synced} · skipped {report.skipped}
              {report.removed ? ` · removed ${report.removed}` : ''} · failed {report.failed}
            </p>
          )}

          {/* advanced: paste an id */}
          <details className="text-[11.5px]" style={{ color: 'var(--cx-mute-2)' }}>
            <summary className="cursor-pointer select-none">Paste a folder ID instead</summary>
            <div className="flex gap-2 mt-2">
              <input
                value={manualId}
                onChange={e => setManualId(e.target.value)}
                placeholder="ID after drive.google.com/…/folders/"
                className="flex-1 px-3 py-1.5 rounded-lg text-[12.5px] border bg-transparent outline-none"
                style={{ borderColor: 'var(--cx-line)', color: 'var(--cx-ink)' }}
              />
              <button
                onClick={() => sync(manualId)}
                disabled={syncing || !manualId.trim()}
                className={btn}
              >
                Sync
              </button>
            </div>
          </details>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-3 text-[12px]" style={{ color: 'var(--cx-err)' }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}
    </div>
  )
}
