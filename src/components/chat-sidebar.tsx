'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createChatSession, deleteChatSession, renameChatSession } from '@/app/session-actions'
import { switchWorkspace } from '@/app/actions'
import {
  Plus, MessageSquare, Trash2, LayoutDashboard,
  Loader2, PanelLeftClose, PanelLeftOpen,
  ChevronDown, Check, Building2, UploadCloud,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { uploadDocument } from '@/app/actions'

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

  async function handleNewChat() {
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
    const fd = new FormData()
    fd.append('file', file)
    fd.append('workspaceId', workspaceId)
    await uploadDocument(fd)
    setUploading(false)
    if (uploadRef.current) uploadRef.current.value = ''
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

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 256 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="flex flex-col h-full flex-shrink-0 overflow-hidden border-r"
      style={{
        background: 'var(--cx-paper)',
        borderColor: 'var(--cx-line)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className={`flex items-center h-[58px] px-3 border-b flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}
        style={{ borderColor: 'var(--cx-line)' }}
      >
        {!collapsed && (
          <div ref={wsRef} className="relative min-w-0 flex-1">
            <button
              onClick={() => workspaces.length > 1 && setWsOpen(v => !v)}
              className={`w-full text-left ${workspaces.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <p className="cx-rule-label leading-none">Workspace</p>
              <div className="flex items-center gap-1 mt-1">
                <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--cx-ink)' }}>
                  {workspaceName}
                </p>
                {workspaces.length > 1 && (
                  <ChevronDown
                    size={12}
                    className={`flex-shrink-0 transition-transform duration-200 ${wsOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--cx-mute-2)' }}
                  />
                )}
              </div>
            </button>

            {wsOpen && workspaces.length > 1 && (
              <div
                className="absolute top-full left-0 mt-2 w-56 cx-panel p-1.5 z-50 cx-fade-up"
              >
                <p className="cx-rule-label px-2 pt-1 pb-1.5">Switch workspace</p>
                {workspaces.map(ws => {
                  const active     = ws.id === workspaceId
                  const isSwitching = switchingWs === ws.id
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                      disabled={active || !!switchingWs}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors"
                      style={{ background: active ? 'var(--cx-paper-2)' : '' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cx-paper-2)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}
                    >
                      <span
                        className="size-5 rounded-md flex items-center justify-center flex-shrink-0 border"
                        style={{
                          background: active ? 'var(--cx-accent-wash)' : 'var(--cx-paper)',
                          borderColor: active ? 'var(--cx-accent-line)' : 'var(--cx-line)',
                        }}
                      >
                        {isSwitching
                          ? <Loader2 size={10} className="cx-spin" style={{ color: 'var(--cx-mute-1)' }} />
                          : active
                            ? <Check size={10} style={{ color: 'var(--cx-accent)' }} strokeWidth={2.5} />
                            : <Building2 size={10} style={{ color: 'var(--cx-mute-2)' }} />}
                      </span>
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

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setCollapsed(v => !v)}
          className="flex-shrink-0 size-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--cx-mute-2)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cx-paper-2)'; e.currentTarget.style.color = 'var(--cx-ink)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--cx-mute-2)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="flex"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </motion.span>
        </motion.button>
      </div>

      {/* ── Upload Document ──────────────────────────────────── */}
      <div className={`px-2 pt-3 pb-1 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        <input
          ref={uploadRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.md,.csv"
          onChange={handleUpload}
        />
        {collapsed ? (
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            title="Upload Document"
            className="size-9 rounded-lg border flex items-center justify-center transition-colors"
            style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-surface)', color: 'var(--cx-mute-1)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cx-accent-wash)'; e.currentTarget.style.borderColor = 'var(--cx-accent-line)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cx-surface)'; e.currentTarget.style.borderColor = 'var(--cx-line)' }}
          >
            {uploading
              ? <Loader2 size={13} className="cx-spin" style={{ color: 'var(--cx-accent)' }} />
              : <UploadCloud size={13} />}
          </button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center gap-2 rounded-full h-9 px-4 text-[12.5px] font-medium border transition-all duration-200 disabled:opacity-50"
            style={{
              borderColor: 'var(--cx-line)',
              background: 'transparent',
              color: 'var(--cx-mute-1)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.background = 'var(--cx-accent-wash)'
              el.style.borderColor = 'var(--cx-accent-line)'
              el.style.color = 'var(--cx-accent)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.background = 'transparent'
              el.style.borderColor = 'var(--cx-line)'
              el.style.color = 'var(--cx-mute-1)'
            }}
          >
            {uploading
              ? <Loader2 size={13} className="cx-spin flex-shrink-0" style={{ color: 'var(--cx-accent)' }} />
              : <UploadCloud size={13} className="flex-shrink-0" />}
            {uploading ? 'Uploading…' : 'Upload Document'}
          </motion.button>
        )}
      </div>

      {/* ── New Chat ─────────────────────────────────────────── */}
      <div className={`px-2 pt-1 pb-2 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            onClick={handleNewChat}
            disabled={creating}
            title="New Chat"
            className="size-9 rounded-lg border flex items-center justify-center transition-colors"
            style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-surface)', color: 'var(--cx-mute-1)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--cx-surface)')}
          >
            {creating
              ? <Loader2 size={13} className="cx-spin" style={{ color: 'var(--cx-accent)' }} />
              : <Plus size={13} />}
          </button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleNewChat}
            disabled={creating}
            className="cx-btn-ink w-full flex items-center gap-2 rounded-full h-9 px-4 text-[12.5px] font-medium disabled:opacity-50"
          >
            {creating
              ? <Loader2 size={13} className="cx-spin flex-shrink-0" />
              : <Plus size={13} className="flex-shrink-0" />}
            {creating ? 'Creating…' : 'New Chat'}
          </motion.button>
        )}
      </div>

      {/* ── Session list ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 py-1 cx-scroll-thin space-y-0.5">
        {!collapsed && sessions.length === 0 && (
          <div className="py-10 text-center px-3">
            <p className="cx-rule-label mb-1">No chats yet</p>
            <p className="text-[12px]" style={{ color: 'var(--cx-mute-2)' }}>
              Click New Chat to begin.
            </p>
          </div>
        )}

        {!collapsed && sessions.length > 0 && (
          <p className="cx-rule-label px-2 pt-1 pb-2">Recent</p>
        )}

        <AnimatePresence initial={false}>
          {sessions.map((session, idx) => {
            const isActive = activeId === session.id
            return (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6, transition: { duration: 0.15 } }}
                transition={{ duration: 0.28, delay: idx < 12 ? idx * 0.025 : 0, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => router.push(`/chat/${session.id}`)}
                title={collapsed ? session.title : undefined}
                className="group relative flex items-center gap-2.5 rounded-lg cursor-pointer transition-colors duration-150"
                style={{
                  padding:        collapsed ? undefined : '8px 10px',
                  justifyContent: collapsed ? 'center'  : undefined,
                  width:          collapsed ? 36        : undefined,
                  height:         collapsed ? 36        : undefined,
                  margin:         collapsed ? '0 auto'  : undefined,
                  background:     isActive  ? 'var(--cx-ink)' : '',
                  color:          isActive  ? '#f2f0eb'       : 'var(--cx-ink-2)',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--cx-paper-2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
              >
                {/* Sliding active indicator bar */}
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    className="absolute left-0 rounded-full pointer-events-none"
                    style={{
                      top: '20%', bottom: '20%',
                      width: 2,
                      background: '#d9a441',
                    }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  />
                )}

                <MessageSquare
                  size={13}
                  className="flex-shrink-0"
                  style={{ color: isActive ? '#d9a441' : 'var(--cx-mute-2)' }}
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
                        className="flex-1 min-w-0 text-[12.5px] font-medium bg-transparent outline-none rounded px-1 -mx-1"
                        style={{
                          color: isActive ? '#f2f0eb' : 'var(--cx-ink)',
                          border: `1px solid ${isActive ? 'rgba(255,255,255,0.25)' : 'var(--cx-accent-line)'}`,
                        }}
                        maxLength={80}
                      />
                    ) : (
                      <span
                        className="flex-1 text-[12.5px] font-medium truncate"
                        onDoubleClick={e => startRename(session, e)}
                        title="Double-click to rename"
                      >
                        {session.title}
                      </span>
                    )}
                    <motion.button
                      initial={false}
                      animate={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      onClick={e => handleDelete(session.id, e)}
                      disabled={deletingId === session.id}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-colors rounded p-0.5"
                      style={{ color: isActive ? 'rgba(255,255,255,0.35)' : 'var(--cx-mute-2)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = isActive ? 'rgba(255,255,255,0.85)' : 'var(--cx-err)')}
                      onMouseLeave={e => (e.currentTarget.style.color = isActive ? 'rgba(255,255,255,0.35)' : 'var(--cx-mute-2)')}
                    >
                      {deletingId === session.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Trash2 size={12} />}
                    </motion.button>
                  </>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div
        className={`p-2 border-t flex-shrink-0 ${collapsed ? 'flex flex-col items-center gap-1' : ''}`}
        style={{ borderColor: 'var(--cx-line)' }}
      >
        <Link
          href="/dashboard"
          title={collapsed ? 'Dashboard' : undefined}
          className="flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium transition-colors"
          style={{
            padding: collapsed ? undefined : '8px 10px',
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

        {!collapsed && (
          <div className="flex items-center gap-2 px-2.5 pt-2 pb-1">
            <Image src="/CortexLogo.png" alt="Cortex" width={14} height={14} className="object-contain opacity-40" />
            <span className="cx-num text-[10px]" style={{ color: 'var(--cx-mute-2)' }}>Cortex v2.0</span>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
