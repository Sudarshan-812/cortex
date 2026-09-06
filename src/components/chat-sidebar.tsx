'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { createChatSession, deleteChatSession, renameChatSession } from '@/app/session-actions'
import { switchWorkspace } from '@/app/actions'
import {
  Plus, MessageSquare, Trash2, LayoutDashboard,
  Loader2, PanelLeftClose, PanelLeftOpen, Pencil, X,
  ChevronDown, Check, Building2, UploadCloud,
} from 'lucide-react'
import Link from 'next/link'
import { useMobileNav } from '@/components/MobileNavContext'

type Session  = { id: string; title: string; updated_at: string }
type Workspace = { id: string; name: string }

export function ChatSidebar({
  sessions: initialSessions,
  workspaceId,
  workspaceName,
  workspaces = [],
}: {
  sessions: Session[]
  workspaceId: string
  workspaceName: string
  workspaces?: Workspace[]
}) {
  const router  = useRouter()
  const params  = useParams()
  const activeId = params?.sessionId as string | undefined
  const { open: navOpen, setOpen: setNavOpen } = useMobileNav()

  const [sessions,    setSessions]    = useState<Session[]>(initialSessions)
  const [creating,    setCreating]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [collapsed,   setCollapsed]   = useState(false)
  const [wsOpen,      setWsOpen]      = useState(false)
  const [switchingWs, setSwitchingWs] = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [renamingId,  setRenamingId]  = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const wsRef     = useRef<HTMLDivElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) setWsOpen(false)
    }
    if (wsOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [wsOpen])

  useEffect(() => {
    try { if (localStorage.getItem('cx-sidebar-collapsed') === '1') setCollapsed(true) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('cx-sidebar-collapsed', collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  async function handleNewChat() {
    setNavOpen(false)
    const existingEmpty = sessions.find(s => s.title === 'New Chat')
    if (existingEmpty) { router.push(`/chat/${existingEmpty.id}`); return }
    setCreating(true)
    const result = await createChatSession(workspaceId)
    if (result.session) {
      setSessions(prev => [result.session!, ...prev])
      router.push(`/chat/${result.session.id}`)
    }
    setCreating(false)
  }

  async function handleDelete(sessionId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setDeletingId(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    await deleteChatSession(sessionId)
    if (activeId === sessionId) router.push('/chat')
    setDeletingId(null)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('workspaceId', workspaceId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const reader = res.body?.getReader()
      if (reader) { while (!(await reader.read()).done) { /* drain to completion */ } }
      router.refresh()
    } finally {
      setUploading(false)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  function startRename(session: Session, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setRenamingId(session.id)
    setRenameValue(session.title)
    setTimeout(() => renameRef.current?.select(), 30)
  }

  async function commitRename(sessionId: string) {
    const trimmed = renameValue.trim()
    setRenamingId(null)
    if (!trimmed || trimmed === sessions.find(s => s.id === sessionId)?.title) return
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: trimmed } : s))
    await renameChatSession(sessionId, trimmed)
  }

  async function handleSwitchWorkspace(wsId: string) {
    if (wsId === workspaceId || switchingWs) return
    setSwitchingWs(wsId)
    setWsOpen(false)
    await switchWorkspace(wsId)
    router.refresh()
    router.push('/chat')
    setSwitchingWs(null)
  }

  const iconBtn = 'size-8 rounded-md border flex items-center justify-center transition-colors'

  return (
    <>
      <div
        onClick={() => setNavOpen(false)}
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${navOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(10,8,6,0.4)' }}
        aria-hidden="true"
      />
    <aside
      style={{ width: collapsed ? 56 : 248, background: 'var(--cx-paper)', borderColor: 'var(--cx-line)' }}
      className={
        'flex flex-col h-full flex-shrink-0 overflow-hidden border-r transition-[width,transform] duration-200 ease-out ' +
        'md:translate-x-0 ' +
        'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:!w-[264px] max-md:shadow-xl ' +
        (navOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full')
      }
    >
      {/* Header */}
      <div
        className={`flex items-center h-[50px] px-3 border-b flex-shrink-0 ${collapsed ? 'md:justify-center' : 'justify-between gap-2'}`}
        style={{ borderColor: 'var(--cx-line)' }}
      >
        <button
          onClick={() => setNavOpen(false)}
          className="md:hidden flex-shrink-0 size-8 rounded-md flex items-center justify-center hover:bg-[var(--cx-paper-2)] order-last"
          style={{ color: 'var(--cx-mute-2)' }}
          aria-label="Close navigation menu"
        >
          <X size={16} />
        </button>
        {!collapsed && (
          <div ref={wsRef} className="relative min-w-0 flex-1">
            <button
              onClick={() => workspaces.length > 1 && setWsOpen(v => !v)}
              className={`w-full text-left ${workspaces.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <p className="text-[10px] font-medium leading-none" style={{ color: 'var(--cx-mute-2)' }}>Workspace</p>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--cx-ink)' }}>
                  {workspaceName}
                </p>
                {workspaces.length > 1 && (
                  <ChevronDown
                    size={11}
                    className={`flex-shrink-0 transition-transform duration-200 ${wsOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--cx-mute-2)' }}
                  />
                )}
              </div>
            </button>

            {wsOpen && workspaces.length > 1 && (
              <div className="absolute top-full left-0 mt-2 w-56 cx-panel p-1 z-50">
                <p className="px-2 pt-1 pb-1 text-[10px] font-medium" style={{ color: 'var(--cx-mute-2)' }}>Switch workspace</p>
                {workspaces.map(ws => {
                  const active     = ws.id === workspaceId
                  const isSwitching = switchingWs === ws.id
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                      disabled={active || !!switchingWs}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors"
                      style={{ background: active ? 'var(--cx-paper-2)' : '' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cx-paper-2)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}
                    >
                      {isSwitching
                        ? <Loader2 size={12} className="cx-spin flex-shrink-0" style={{ color: 'var(--cx-mute-1)' }} />
                        : active
                          ? <Check size={12} className="flex-shrink-0" style={{ color: 'var(--cx-accent)' }} strokeWidth={2.5} />
                          : <Building2 size={12} className="flex-shrink-0" style={{ color: 'var(--cx-mute-2)' }} />}
                      <span className="text-[12.5px] font-medium truncate" style={{ color: active ? 'var(--cx-ink)' : 'var(--cx-ink-2)' }}>
                        {ws.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setCollapsed(v => !v)}
          className="hidden md:flex flex-shrink-0 size-8 rounded-md items-center justify-center transition-colors"
          style={{ color: 'var(--cx-mute-2)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cx-paper-2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Actions */}
      <div className={`px-2 pt-2.5 pb-2 flex-shrink-0 space-y-1.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <input ref={uploadRef} type="file" className="hidden" accept=".pdf,.docx,.xlsx" onChange={handleUpload} />

        {collapsed ? (
          <button
            onClick={handleNewChat}
            disabled={creating}
            title="New chat"
            className={iconBtn + ' cx-btn-ink'}
          >
            {creating ? <Loader2 size={13} className="cx-spin" /> : <Plus size={13} />}
          </button>
        ) : (
          <button
            onClick={handleNewChat}
            disabled={creating}
            className="cx-btn-ink w-full flex items-center justify-center gap-2 rounded-md h-8 px-3 text-[12.5px] font-medium disabled:opacity-50"
          >
            {creating ? <Loader2 size={13} className="cx-spin" /> : <Plus size={13} />}
            {creating ? 'Creating…' : 'New chat'}
          </button>
        )}

        {collapsed ? (
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            title="Upload a file"
            className={iconBtn}
            style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-surface)', color: 'var(--cx-mute-1)' }}
          >
            {uploading ? <Loader2 size={13} className="cx-spin" style={{ color: 'var(--cx-accent)' }} /> : <UploadCloud size={13} />}
          </button>
        ) : (
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            className="cx-btn-ghost w-full flex items-center justify-center gap-2 rounded-md h-8 px-3 text-[12.5px] font-medium disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="cx-spin" style={{ color: 'var(--cx-accent)' }} /> : <UploadCloud size={13} />}
            {uploading ? 'Uploading…' : 'Upload a file'}
          </button>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 cx-scroll-thin space-y-px">
        {!collapsed && sessions.length === 0 && (
          <div className="py-10 text-center px-3">
            <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--cx-mute-1)' }}>No chats yet</p>
            <p className="text-[12px]" style={{ color: 'var(--cx-mute-2)' }}>Click New chat to begin.</p>
          </div>
        )}

        {!collapsed && sessions.length > 0 && (
          <p className="px-2 pt-1.5 pb-1.5 text-[10px] font-medium" style={{ color: 'var(--cx-mute-2)' }}>Recent</p>
        )}

        <AnimatePresence initial={false}>
          {sessions.map(session => {
            const isActive = activeId === session.id
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
                onClick={() => router.push(`/chat/${session.id}`)}
                title={collapsed ? session.title : undefined}
                className="group relative flex items-center gap-2 rounded-md cursor-pointer transition-colors"
                style={{
                  padding:        collapsed ? undefined : '6px 8px 6px 10px',
                  justifyContent: collapsed ? 'center'  : undefined,
                  width:          collapsed ? 36        : undefined,
                  height:         collapsed ? 36        : undefined,
                  margin:         collapsed ? '0 auto'  : undefined,
                  background:     isActive  ? 'var(--cx-paper-2)' : '',
                  boxShadow:      isActive && !collapsed ? 'inset 2px 0 0 var(--cx-accent)' : undefined,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--cx-paper-2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
              >
                <MessageSquare
                  size={13}
                  className="flex-shrink-0"
                  style={{ color: isActive ? 'var(--cx-accent)' : 'var(--cx-mute-2)' }}
                />
                {!collapsed && (
                  <>
                    {renamingId === session.id ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          e.stopPropagation()
                          if (e.key === 'Enter') commitRename(session.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        onBlur={() => commitRename(session.id)}
                        className="flex-1 min-w-0 text-[12.5px] bg-transparent outline-none rounded px-1 -mx-1"
                        style={{ color: 'var(--cx-ink)', border: '1px solid var(--cx-line-2)' }}
                        maxLength={80}
                      />
                    ) : (
                      <span
                        className="flex-1 text-[12.5px] truncate"
                        style={{ color: isActive ? 'var(--cx-ink)' : 'var(--cx-ink-2)', fontWeight: isActive ? 600 : 400 }}
                        onDoubleClick={e => startRename(session, e)}
                        title="Double-click to rename"
                      >
                        {session.title}
                      </span>
                    )}
                    {renamingId !== session.id && (
                      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={e => startRename(session, e)}
                          aria-label={`Rename "${session.title}"`}
                          className="rounded p-1 hover:bg-[var(--cx-line)]"
                          style={{ color: 'var(--cx-mute-2)' }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={e => handleDelete(session.id, e)}
                          disabled={deletingId === session.id}
                          aria-label={`Delete "${session.title}"`}
                          className="rounded p-1 hover:bg-[var(--cx-line)]"
                          style={{ color: 'var(--cx-mute-2)' }}
                        >
                          {deletingId === session.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Trash2 size={11} />}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        className={`p-2 border-t flex-shrink-0 ${collapsed ? 'flex flex-col items-center' : ''}`}
        style={{ borderColor: 'var(--cx-line)' }}
      >
        <Link
          href="/dashboard"
          title={collapsed ? 'Dashboard' : undefined}
          className="flex items-center gap-2 rounded-md text-[12.5px] transition-colors"
          style={{
            padding: collapsed ? undefined : '7px 10px',
            justifyContent: collapsed ? 'center' : undefined,
            width: collapsed ? 36 : '100%',
            height: collapsed ? 36 : undefined,
            color: 'var(--cx-mute-1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cx-paper-2)'; e.currentTarget.style.color = 'var(--cx-ink)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--cx-mute-1)' }}
        >
          <LayoutDashboard size={14} className="flex-shrink-0" />
          {!collapsed && 'Dashboard'}
        </Link>
      </div>
    </aside>
    </>
  )
}
