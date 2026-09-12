'use client'

import { useState } from 'react'
import { Building2, Check, ChevronDown, Loader2, Plus, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Workspace = { id: string; name: string }

/**
 * Shared workspace-switcher dropdown for both the app sidebar and the chat
 * sidebar, built on shadcn `DropdownMenu` (replacing the hand-rolled
 * `DropdownMenu.tsx` panel in the app sidebar and the raw click-outside div
 * in the chat sidebar).
 *
 * `variant="full"` matches the app sidebar: an icon trigger when collapsed,
 * an inline "New workspace" creator. `variant="compact"` matches the chat
 * sidebar: label-only, no collapsed trigger, no creation - it's hidden
 * entirely when collapsed or when there's nothing to switch between.
 */
export function WorkspaceSwitcher({
  workspace,
  workspaces,
  collapsed = false,
  variant = 'full',
  onSwitch,
  onCreate,
}: {
  workspace: Workspace
  workspaces: Workspace[]
  collapsed?: boolean
  variant?: 'full' | 'compact'
  onSwitch: (id: string) => Promise<void> | void
  onCreate?: (name: string) => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const canSwitch = workspaces.length > 1

  async function handleSwitch(id: string) {
    if (id === workspace.id || switching) return
    setSwitching(id)
    await onSwitch(id)
    setSwitching(null)
    setOpen(false)
  }

  async function handleCreate() {
    if (!newName.trim() || creating || !onCreate) return
    setCreating(true)
    await onCreate(newName.trim())
    setCreating(false)
    setShowCreate(false)
    setNewName('')
    setOpen(false)
  }

  function resetCreate() {
    setShowCreate(false)
    setNewName('')
  }

  if (variant === 'compact' && collapsed) return null
  if (variant === 'compact' && !canSwitch && !onCreate) {
    return (
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium leading-none text-muted-foreground">Workspace</p>
        <p className="text-[12.5px] font-semibold truncate mt-0.5 text-foreground">{workspace.name}</p>
      </div>
    )
  }

  const rowClass = (active: boolean) =>
    cn(
      'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors',
      active ? 'bg-secondary' : 'hover:bg-secondary'
    )

  return (
    <DropdownMenu
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) resetCreate()
      }}
    >
      <DropdownMenuTrigger asChild>
        {collapsed && variant === 'full' ? (
          <button
            title={workspace.name}
            className="size-9 rounded-lg border border-border bg-card flex items-center justify-center"
          >
            <Building2 size={14} className="text-muted-foreground" />
          </button>
        ) : variant === 'compact' ? (
          <button
            disabled={!canSwitch}
            className={cn('w-full text-left min-w-0 flex-1', canSwitch ? 'cursor-pointer' : 'cursor-default')}
          >
            <p className="text-[10px] font-medium leading-none text-muted-foreground">Workspace</p>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[12.5px] font-semibold truncate text-foreground">{workspace.name}</p>
              {canSwitch && (
                <ChevronDown
                  size={11}
                  className={cn('flex-shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
                />
              )}
            </div>
          </button>
        ) : (
          <button className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary">
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-medium text-muted-foreground">Workspace</p>
              <p className="text-[13px] font-semibold truncate mt-0.5 text-foreground">{workspace.name}</p>
            </div>
            <ChevronDown
              size={13}
              className={cn('flex-shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
            />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="cx-panel w-[260px] p-1.5">
        <DropdownMenuLabel className="px-2.5 pt-1 pb-1 text-[10.5px] font-medium text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map(ws => {
          const active = ws.id === workspace.id
          const isSwitching = switching === ws.id
          return (
            <button key={ws.id} onClick={() => handleSwitch(ws.id)} className={rowClass(active)}>
              <Building2 size={13} className={cn('flex-shrink-0', active ? 'text-accent' : 'text-muted-foreground')} />
              <p className="text-[12.5px] font-medium truncate flex-1 text-foreground">{ws.name}</p>
              {isSwitching ? (
                <Loader2 size={12} className="cx-spin flex-shrink-0 text-muted-foreground" />
              ) : (
                active && <Check size={12} className="flex-shrink-0 text-accent" strokeWidth={2.5} />
              )}
            </button>
          )
        })}

        {onCreate && (
          <>
            <DropdownMenuSeparator />
            {showCreate ? (
              <div className="px-1 py-1" onKeyDown={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border border-[var(--gold-line)] bg-[var(--gold-wash)]">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreate()
                      if (e.key === 'Escape') resetCreate()
                    }}
                    placeholder="Workspace name…"
                    className="flex-1 text-[12.5px] outline-none bg-transparent text-foreground"
                  />
                  <button onClick={handleCreate} disabled={!newName.trim() || creating} className="flex-shrink-0">
                    {creating ? (
                      <Loader2 size={12} className="cx-spin text-muted-foreground" />
                    ) : (
                      <Check size={12} className="text-[var(--ok)]" strokeWidth={2.5} />
                    )}
                  </button>
                  <button onClick={resetCreate}>
                    <X size={12} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-secondary"
              >
                <span className="size-6 rounded-md flex items-center justify-center flex-shrink-0 border border-dashed border-border">
                  <Plus size={11} className="text-muted-foreground" />
                </span>
                <p className="text-[12.5px] font-medium text-muted-foreground">New workspace</p>
              </button>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
