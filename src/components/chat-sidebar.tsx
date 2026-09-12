'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { createChatSession, deleteChatSession, renameChatSession } from '@/app/session-actions'
import { switchWorkspace } from '@/app/actions'
import {
  Plus, MessageSquare, Trash2, Home,
  Loader2, PanelLeftClose, PanelLeftOpen, Pencil, X,
  UploadCloud,
} from 'lucide-react'
import Link from 'next/link'
import { useMobileNav } from '@/components/MobileNavContext'
import { SidebarFrame } from '@/components/sidebar/sidebar-frame'
import { useSidebarCollapse } from '@/components/sidebar/use-sidebar-collapse'
import { WorkspaceSwitcher } from '@/components/sidebar/workspace-switcher'
import { cn } from '@/lib/utils'

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
  const { setOpen: setNavOpen } = useMobileNav()

  const [sessions,    setSessions]    = useState<Session[]>(initialSessions)
  const [creating,    setCreating]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [collapsed,   setCollapsed]   = useSidebarCollapse()
  const [uploading,   setUploading]   = useState(false)
  const [renamingId,  setRenamingId]  = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

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
    await switchWorkspace(wsId)
    router.refresh()
    router.push('/chat')
  }

  const iconBtn = 'size-8 rounded-md border flex items-center justify-center transition-colors'

  return (
    <SidebarFrame
      collapsed={collapsed}
      widthExpanded={248}
      widthCollapsed={56}
      ariaLabel="Chat sessions"
      className="h-full"
    >
      {/* Header */}
      <div className={cn('flex items-center h-[50px] px-3 border-b border-border flex-shrink-0', collapsed ? 'md:justify-center' : 'justify-between gap-2')}>
        <button
          onClick={() => setNavOpen(false)}
          className="md:hidden flex-shrink-0 size-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary order-last"
          aria-label="Close navigation menu"
        >
          <X size={16} />
        </button>
        {!collapsed && (
          <WorkspaceSwitcher
            workspace={{ id: workspaceId, name: workspaceName }}
            workspaces={workspaces}
            variant="compact"
            onSwitch={handleSwitchWorkspace}
          />
        )}

        <button
          onClick={() => setCollapsed(v => !v)}
          className="hidden md:flex flex-shrink-0 size-8 rounded-md items-center justify-center text-muted-foreground transition-colors hover:bg-secondary"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Actions */}
      <div className={cn('px-2 pt-2.5 pb-2 flex-shrink-0 space-y-1.5', collapsed && 'flex flex-col items-center')}>
        <input ref={uploadRef} type="file" className="hidden" accept=".pdf,.docx,.xlsx" onChange={handleUpload} />

        {collapsed ? (
          <button onClick={handleNewChat} disabled={creating} title="New chat" className={cn(iconBtn, 'cx-btn-ink')}>
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
            className={cn(iconBtn, 'border-border bg-card text-muted-foreground')}
          >
            {uploading ? <Loader2 size={13} className="cx-spin text-accent" /> : <UploadCloud size={13} />}
          </button>
        ) : (
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            className="cx-btn-ghost w-full flex items-center justify-center gap-2 rounded-md h-8 px-3 text-[12.5px] font-medium disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="cx-spin text-accent" /> : <UploadCloud size={13} />}
            {uploading ? 'Uploading…' : 'Upload a file'}
          </button>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 cx-scroll-thin space-y-px">
        {!collapsed && sessions.length === 0 && (
          <div className="py-10 text-center px-3">
            <p className="text-[12px] font-medium mb-1 text-muted-foreground">No chats yet</p>
            <p className="text-[12px] text-muted-foreground">Click New chat to begin.</p>
          </div>
        )}

        {!collapsed && sessions.length > 0 && (
          <p className="px-2 pt-1.5 pb-1.5 text-[10px] font-medium text-muted-foreground">Recent</p>
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
                className={cn('group relative flex items-center gap-2 rounded-md cursor-pointer transition-colors', isActive ? 'bg-secondary' : 'hover:bg-secondary')}
                style={{
                  padding:        collapsed ? undefined : '6px 8px 6px 10px',
                  justifyContent: collapsed ? 'center'  : undefined,
                  width:          collapsed ? 36        : undefined,
                  height:         collapsed ? 36        : undefined,
                  margin:         collapsed ? '0 auto'  : undefined,
                  boxShadow:      isActive && !collapsed ? 'inset 2px 0 0 var(--accent)' : undefined,
                }}
              >
                <MessageSquare size={13} className={cn('flex-shrink-0', isActive ? 'text-accent' : 'text-muted-foreground')} />
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
                        className="flex-1 min-w-0 text-[12.5px] bg-transparent outline-none rounded px-1 -mx-1 text-foreground border border-[var(--line-2)]"
                        maxLength={80}
                      />
                    ) : (
                      <span
                        className={cn('flex-1 text-[12.5px] truncate', isActive ? 'text-foreground font-semibold' : 'text-foreground/80 font-normal')}
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
                          className="rounded p-1 hover:bg-[var(--line)] text-muted-foreground"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={e => handleDelete(session.id, e)}
                          disabled={deletingId === session.id}
                          aria-label={`Delete "${session.title}"`}
                          className="rounded p-1 hover:bg-[var(--line)] text-muted-foreground"
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
      <div className={cn('p-2 border-t border-border flex-shrink-0', collapsed && 'flex flex-col items-center')}>
        <Link
          href="/"
          title={collapsed ? 'Home' : undefined}
          className="flex items-center gap-2 rounded-md text-[12.5px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          style={{
            padding: collapsed ? undefined : '7px 10px',
            justifyContent: collapsed ? 'center' : undefined,
            width: collapsed ? 36 : '100%',
            height: collapsed ? 36 : undefined,
          }}
        >
          <Home size={14} className="flex-shrink-0" />
          {!collapsed && 'Home'}
        </Link>
      </div>
    </SidebarFrame>
  )
}
