'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search, Bell, ChevronDown, Check, Building2, Settings,
  LogOut, Plus, Loader2, X, BellOff,
} from 'lucide-react'
import { switchWorkspace, createNewWorkspace, deleteWorkspace } from '@/app/actions'
import { SearchModal } from '@/components/SearchModal'

type Workspace = { id: string; name: string; created_at: string }
type User = { name: string; email: string; avatarUrl?: string }

export function DashboardNavbar({
  workspace,
  workspaces,
  user,
}: {
  workspace: Workspace
  workspaces: Workspace[]
  user: User
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [devMode, setDevMode] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreate(false)
        setNewName('')
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setDevMode(localStorage.getItem('cortex_dev_mode') === 'true')
    function onCustom(e: Event) {
      setDevMode((e as CustomEvent<string>).detail === 'true')
    }
    window.addEventListener('cortex-dev-mode-change', onCustom)
    return () => window.removeEventListener('cortex-dev-mode-change', onCustom)
  }, [])

  function toggleDevMode() {
    const next = !devMode
    setDevMode(next)
    localStorage.setItem('cortex_dev_mode', String(next))
    window.dispatchEvent(new CustomEvent('cortex-dev-mode-change', { detail: String(next) }))
  }

  useEffect(() => {
    function handleCmdK(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    document.addEventListener('keydown', handleCmdK)
    return () => document.removeEventListener('keydown', handleCmdK)
  }, [])

  async function handleSwitch(id: string) {
    if (id === workspace.id || switching) return
    setSwitching(id)
    setOpen(false)
    await switchWorkspace(id)
    router.refresh()
    setSwitching(null)
  }

  async function handleCreate() {
    if (!newName.trim() || creating) return
    setCreating(true)
    await createNewWorkspace(newName.trim())
    setShowCreate(false)
    setNewName('')
    setCreating(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteWorkspace(id)
    router.refresh()
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const navLink = "px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors text-[color:var(--cx-mute-1)] hover:text-[color:var(--cx-ink)]"

  return (
    <>
    <header
      className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl border-b"
      style={{ background: 'rgba(246,245,242,0.88)', borderColor: 'var(--cx-line)' }}
    >
      <div className="max-w-[1240px] mx-auto px-6 h-[58px] flex items-center justify-between gap-6">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <Image src="/CortexLogo.png" alt="Cortex" width={24} height={24} className="object-contain" />
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>Cortex</span>
            <span className="text-[10px] font-mono ml-0.5 pl-2 border-l" style={{ color: 'var(--cx-mute-2)', borderColor: 'var(--cx-line)' }}>v2.0</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard" className={`${navLink} font-semibold`} style={{ color: 'var(--cx-ink)' }}>Overview</Link>
            <Link href="/dashboard#documents" className={navLink}>Documents</Link>
            <Link href="/dashboard/analytics" className={navLink}>Analytics</Link>
            <Link href="/chat" className={navLink}>Agents</Link>
          </nav>
        </div>

        {/* Right: dev-toggle + search + bell + avatar */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Dev mode badge */}
          {devMode && (
            <span
              className="hidden sm:flex items-center h-6 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
              style={{ background: 'rgba(234,179,8,0.15)', color: '#92400e' }}
            >
              DEV MODE ACTIVE
            </span>
          )}

          {/* Dev mode toggle */}
          <button
            onClick={toggleDevMode}
            className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium transition-all duration-200 flex-shrink-0"
            style={{
              borderColor: devMode ? 'rgba(234,179,8,0.6)' : 'var(--cx-line)',
              background: devMode ? 'rgba(234,179,8,0.1)' : 'transparent',
              color: devMode ? '#92400e' : 'var(--cx-mute-1)',
            }}
            title={devMode ? 'Switch to User View' : 'Switch to Dev Mode'}
          >
            <Settings size={13} />
            {devMode ? 'Dev Mode' : 'User View'}
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg border transition-colors text-[12px]"
            style={{ borderColor: 'var(--cx-line)', background: 'rgba(255,255,255,0.5)', color: 'var(--cx-mute-1)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cx-accent-line)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--cx-line)')}
          >
            <Search size={13} />
            <span className="mr-6">Search documents</span>
            <kbd
              className="flex items-center h-4 px-1.5 rounded border text-[10px] font-mono"
              style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)', color: 'var(--cx-mute-1)' }}
            >
              ⌘K
            </kbd>
          </button>

          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen(o => !o)}
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors relative"
              style={{ color: bellOpen ? 'var(--cx-ink)' : 'var(--cx-mute-1)', background: bellOpen ? 'var(--cx-paper-2)' : '' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper-2)')}
              onMouseLeave={e => { if (!bellOpen) e.currentTarget.style.background = '' }}
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full" style={{ background: 'var(--cx-accent)' }} />
            </button>

            <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                style={{ transformOrigin: 'top right' }}
                className="absolute top-[calc(100%+8px)] right-0 w-[280px] cx-panel p-4 z-50"
              >
                <p className="cx-rule-label mb-3">Notifications</p>
                <div className="flex flex-col items-center py-6 gap-2">
                  <BellOff size={20} style={{ color: 'var(--cx-mute-2)' }} />
                  <p className="text-[12.5px] font-medium" style={{ color: 'var(--cx-mute-1)' }}>No notifications</p>
                  <p className="text-[11.5px] text-center" style={{ color: 'var(--cx-mute-2)' }}>
                    You&apos;re all caught up. Alerts will appear here.
                  </p>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Workspace / avatar dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <div
                className="h-7 w-7 rounded-full overflow-hidden border flex items-center justify-center text-[11px] font-bold"
                style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-paper-2)', color: 'var(--cx-ink)' }}
              >
                {user.avatarUrl
                  ? <Image src={user.avatarUrl} alt="" width={28} height={28} className="object-cover w-full h-full" />
                  : <span>{initials}</span>}
              </div>
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-[11.5px] font-semibold truncate max-w-[140px] leading-tight" style={{ color: 'var(--cx-ink)' }}>
                  {workspace.name}
                </span>
                <span className="text-[10px] leading-tight" style={{ color: 'var(--cx-mute-2)' }}>Owner</span>
              </div>
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                style={{ color: 'var(--cx-mute-2)' }}
              />
            </button>

            <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                style={{ transformOrigin: 'top right' }}
                className="absolute top-[calc(100%+8px)] right-0 w-[300px] cx-panel p-1.5 z-50"
              >
                {/* User info */}
                <div className="flex items-center gap-2.5 px-2.5 py-2.5">
                  <div
                    className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-paper-2)', color: 'var(--cx-ink)' }}
                  >
                    {user.avatarUrl
                      ? <Image src={user.avatarUrl} alt="" width={32} height={32} className="object-cover w-full h-full" />
                      : <span>{initials}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--cx-ink)' }}>{user.name}</p>
                    <p className="text-[10.5px] truncate cx-num" style={{ color: 'var(--cx-mute-2)' }}>{user.email}</p>
                  </div>
                </div>

                <div className="cx-hdiv mx-1 my-1" />
                <p className="px-2.5 pt-1.5 pb-1 cx-rule-label">Workspaces</p>

                {workspaces.map(ws => {
                  const active = ws.id === workspace.id
                  const isSwitching = switching === ws.id
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitch(ws.id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                      style={{ background: active ? 'var(--cx-paper-2)' : '' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cx-paper-2)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}
                    >
                      <span
                        className="size-6 rounded-md flex items-center justify-center flex-shrink-0 border"
                        style={{
                          background: active ? 'var(--cx-accent-wash)' : 'var(--cx-paper)',
                          borderColor: active ? 'var(--cx-accent-line)' : 'var(--cx-line)',
                        }}
                      >
                        {isSwitching
                          ? <Loader2 size={11} className="cx-spin" style={{ color: 'var(--cx-mute-1)' }} />
                          : <Building2 size={12} style={{ color: active ? 'var(--cx-accent)' : 'var(--cx-mute-1)' }} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--cx-ink)' }}>{ws.name}</p>
                        <p className="text-[10.5px] font-mono" style={{ color: 'var(--cx-mute-2)' }}>owner</p>
                      </div>
                      {active && <Check size={12} style={{ color: 'var(--cx-accent)' }} strokeWidth={2.5} className="flex-shrink-0" />}
                    </button>
                  )
                })}

                {/* Create workspace */}
                {showCreate ? (
                  <div className="px-2.5 py-2">
                    <div
                      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border"
                      style={{ borderColor: 'var(--cx-accent-line)', background: 'var(--cx-accent-wash)' }}
                    >
                      <input
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreate()
                          if (e.key === 'Escape') { setShowCreate(false); setNewName('') }
                        }}
                        placeholder="Workspace name…"
                        className="flex-1 text-[12.5px] outline-none bg-transparent"
                        style={{ color: 'var(--cx-ink)' }}
                      />
                      <button onClick={handleCreate} disabled={!newName.trim() || creating} className="flex-shrink-0">
                        {creating
                          ? <Loader2 size={12} className="cx-spin" style={{ color: 'var(--cx-mute-1)' }} />
                          : <Check size={12} style={{ color: 'var(--cx-ok)' }} strokeWidth={2.5} />}
                      </button>
                      <button onClick={() => { setShowCreate(false); setNewName('') }}>
                        <X size={12} style={{ color: 'var(--cx-mute-2)' }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <span
                      className="size-6 rounded-md flex items-center justify-center flex-shrink-0 border border-dashed"
                      style={{ borderColor: 'var(--cx-line-2)' }}
                    >
                      <Plus size={11} style={{ color: 'var(--cx-mute-2)' }} />
                    </span>
                    <p className="text-[12.5px] font-medium" style={{ color: 'var(--cx-mute-1)' }}>New workspace</p>
                  </button>
                )}

                <div className="cx-hdiv mx-1 my-1" />
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors"
                  style={{ color: 'var(--cx-ink-2)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                  onClick={() => setOpen(false)}
                >
                  <Settings size={13} style={{ color: 'var(--cx-mute-1)' }} /> Settings
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors"
                    style={{ color: 'var(--cx-mute-1)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                </form>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>

    <SearchModal
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
      workspaceId={workspace.id}
    />
    </>
  )
}
