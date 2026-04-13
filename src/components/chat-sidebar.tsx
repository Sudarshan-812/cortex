'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createChatSession, deleteChatSession } from '@/app/session-actions'
import { switchWorkspace } from '@/app/actions'
import {
  Plus, MessageSquare, Trash2, LayoutDashboard,
  Loader2, PanelLeftClose, PanelLeftOpen, ChevronDown,
  Check, FolderOpen,
} from 'lucide-react'
import Link from 'next/link'

type Session = {
  id: string
  title: string
  updated_at: string
}

type Workspace = {
  id: string
  name: string
}

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
  const router = useRouter()
  const params = useParams()
  const activeId = params?.sessionId as string | undefined

  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [wsOpen, setWsOpen] = useState(false)
  const [switchingWs, setSwitchingWs] = useState<string | null>(null)
  const wsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false)
      }
    }
    if (wsOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    await deleteChatSession(sessionId)
    if (activeId === sessionId) router.push('/chat')
    setDeletingId(null)
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

  const hasMultipleWorkspaces = workspaces.length > 1

  return (
    <aside
      className={`
        flex flex-col h-full bg-zinc-50/90 backdrop-blur-xl border-r border-zinc-200/60
        flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-[60px]' : 'w-[260px]'}
      `}
    >
      <div className={`flex items-center h-14 px-3 border-b border-zinc-200/60 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div ref={wsRef} className="relative min-w-0 flex-1 mr-2">
            {hasMultipleWorkspaces ? (
              <button onClick={() => setWsOpen(v => !v)} className="w-full text-left group">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Workspace</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-[13px] font-semibold text-zinc-800 truncate">{workspaceName}</p>
                  <ChevronDown className={`size-3 text-zinc-400 flex-shrink-0 transition-transform ${wsOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
            ) : (
              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Workspace</p>
                <p className="text-[13px] font-semibold text-zinc-800 truncate mt-0.5">{workspaceName}</p>
              </div>
            )}

            {wsOpen && hasMultipleWorkspaces && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-50 py-1">
                {workspaces.map(ws => {
                  const isActive = ws.id === workspaceId
                  const isSwitching = switchingWs === ws.id
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                      disabled={isActive || !!switchingWs}
                      className={`
                        w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors
                        ${isActive ? 'bg-zinc-50 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'}
                      `}
                    >
                      {isSwitching ? (
                        <Loader2 className="size-3.5 animate-spin text-fuchsia-500 flex-shrink-0" />
                      ) : isActive ? (
                        <Check className="size-3.5 text-fuchsia-500 flex-shrink-0" />
                      ) : (
                        <FolderOpen className="size-3.5 text-zinc-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{ws.name}</span>
                    </button>
                  )
                })}
                <div className="border-t border-zinc-100 mt-1 pt-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setWsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-medium text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Plus className="size-3.5" />
                    Manage workspaces
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex-shrink-0 size-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-all"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <div className={`px-2 pt-3 pb-2 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            onClick={handleNewChat}
            disabled={creating}
            title="New Chat"
            className="size-9 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors shadow-sm disabled:opacity-50"
          >
            {creating
              ? <Loader2 className="size-3.5 animate-spin text-fuchsia-500" />
              : <Plus className="size-3.5" />
            }
          </button>
        ) : (
          <button
            onClick={handleNewChat}
            disabled={creating}
            className="w-full flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {creating
              ? <Loader2 className="size-3.5 animate-spin flex-shrink-0 text-fuchsia-500" />
              : <Plus className="size-3.5 flex-shrink-0 text-zinc-500" />
            }
            {creating ? 'Creating…' : 'New Chat'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {!collapsed && sessions.length === 0 && (
          <p className="text-[11.5px] text-zinc-400 text-center py-8 px-4 leading-relaxed">
            No chats yet.<br />
            <span className="font-semibold text-zinc-600">New Chat</span> to begin.
          </p>
        )}

        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => router.push(`/chat/${session.id}`)}
            title={collapsed ? session.title : undefined}
            className={`
              group flex items-center gap-2.5 rounded-xl cursor-pointer transition-all duration-150
              ${collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-3 py-2.5'}
              ${activeId === session.id
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900'
              }
            `}
          >
            <MessageSquare className={`size-3.5 flex-shrink-0 ${activeId === session.id ? 'text-zinc-300' : 'text-zinc-400'}`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-[13px] font-medium truncate">{session.title}</span>
                <button
                  onClick={e => handleDelete(session.id, e)}
                  disabled={deletingId === session.id}
                  className={`opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all rounded-md p-0.5 ${
                    activeId === session.id ? 'hover:text-red-300 text-zinc-400' : 'hover:text-red-500 text-zinc-400'
                  }`}
                >
                  {deletingId === session.id
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Trash2 className="size-3.5" />
                  }
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className={`p-2 border-t border-zinc-200/60 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        <Link
          href="/dashboard"
          title={collapsed ? 'Dashboard' : undefined}
          className={`
            flex items-center gap-2.5 rounded-xl text-[13px] font-medium text-zinc-500
            hover:bg-zinc-200/60 hover:text-zinc-900 transition-colors
            ${collapsed ? 'size-9 justify-center' : 'px-3 py-2.5'}
          `}
        >
          <LayoutDashboard className="size-4 flex-shrink-0" />
          {!collapsed && 'Dashboard'}
        </Link>
      </div>
    </aside>
  )
}
