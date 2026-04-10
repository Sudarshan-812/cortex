'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, Loader2, FolderOpen, Trash2, X, AlertTriangle } from 'lucide-react'
import { switchWorkspace, createNewWorkspace, deleteWorkspace } from '@/app/actions'

type Workspace = {
  id: string
  name: string
  created_at: string
}

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: Workspace[]
  activeId: string
}) {
  const router = useRouter()
  const [switching, setSwitching] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleSwitch(workspaceId: string) {
    if (workspaceId === activeId || switching) return
    setSwitching(workspaceId)
    await switchWorkspace(workspaceId)
    router.refresh()
    setSwitching(null)
  }

  async function handleCreate() {
    if (!name.trim() || creating) return
    setCreating(true)
    setCreateError('')
    const result = await createNewWorkspace(name.trim())
    if (result?.error) {
      setCreateError(result.error)
      setCreating(false)
    } else {
      setShowCreate(false)
      setName('')
      router.refresh()
      setCreating(false)
    }
  }

  async function handleDelete(workspaceId: string) {
    setDeleting(workspaceId)
    setConfirmDelete(null)
    await deleteWorkspace(workspaceId)
    router.refresh()
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-3 mb-8">

      {/* ── Workspace tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {workspaces.map(ws => {
          const isActive = ws.id === activeId
          const isSwitching = switching === ws.id
          const isDeleting = deleting === ws.id
          const isConfirming = confirmDelete === ws.id

          return (
            <div key={ws.id} className="relative group/tab">
              <button
                onClick={() => handleSwitch(ws.id)}
                disabled={!!switching || isActive}
                className={`
                  inline-flex items-center gap-2 pl-3.5 pr-3 py-2 rounded-full text-[13px] font-semibold transition-all duration-200
                  ${isActive
                    ? 'bg-zinc-900 text-white shadow-sm pr-3.5'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 hover:shadow-sm'
                  }
                  ${isSwitching || isDeleting ? 'opacity-60' : ''}
                `}
              >
                {isSwitching || isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin flex-shrink-0" />
                ) : (
                  <FolderOpen className={`size-3.5 flex-shrink-0 ${isActive ? 'text-zinc-300' : 'text-zinc-400'}`} />
                )}
                <span className="max-w-[160px] truncate">{ws.name}</span>

                {/* Delete button — only on inactive tabs, 2+ workspaces */}
                {!isActive && workspaces.length > 1 && (
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); setConfirmDelete(ws.id) }}
                    className="ml-0.5 size-4 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/tab:opacity-100 transition-all"
                    title="Delete workspace"
                  >
                    <Trash2 className="size-2.5" />
                  </span>
                )}
              </button>

              {/* Confirm delete popover */}
              {isConfirming && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-red-100 rounded-2xl shadow-xl p-4 w-64">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="size-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-950">Delete workspace?</p>
                      <p className="text-[11.5px] text-zinc-500 mt-0.5 leading-relaxed">
                        All documents, embeddings, and chats will be permanently removed.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(ws.id)}
                      className="flex-1 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white text-[12px] font-bold transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="flex-1 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[12px] font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* New workspace button */}
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-zinc-500 border border-dashed border-zinc-300 hover:border-fuchsia-300 hover:text-fuchsia-600 hover:bg-fuchsia-50/60 transition-all duration-200"
          >
            <Plus className="size-3.5" />
            New Workspace
          </button>
        )}
      </div>

      {/* ── Inline create form ── */}
      {showCreate && (
        <div className="flex flex-col gap-1.5 max-w-sm">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-fuchsia-300 focus-within:ring-2 focus-within:ring-fuchsia-100 transition-all">
            <FolderOpen className="size-3.5 text-zinc-400 flex-shrink-0" />
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setShowCreate(false); setName(''); setCreateError('') }
              }}
              placeholder="Workspace name…"
              className="flex-1 text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="size-7 rounded-full bg-zinc-900 text-white flex items-center justify-center disabled:opacity-40 transition-all hover:bg-zinc-700"
              >
                {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              </button>
              <button
                onClick={() => { setShowCreate(false); setName(''); setCreateError('') }}
                className="size-7 rounded-full hover:bg-zinc-100 text-zinc-400 flex items-center justify-center transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
          {createError && (
            <p className="text-[11.5px] text-red-500 px-1">{createError}</p>
          )}
        </div>
      )}
    </div>
  )
}
