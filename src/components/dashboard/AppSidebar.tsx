'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BarChart2, Settings, MessageSquare, Search,
  ChevronDown, Check, Building2, Plus, Loader2, X, LogOut,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { switchWorkspace, createNewWorkspace } from '@/app/actions'
import { SearchModal } from '@/components/SearchModal'
import { DropdownMenu } from '@/components/dashboard/DropdownMenu'
import { useMobileNav } from '@/components/MobileNavContext'

type Workspace = { id: string; name: string; created_at: string }
type User = { name: string; email: string; avatarUrl?: string }

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/chat', label: 'Chat', icon: MessageSquare, exact: false },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2, exact: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, exact: true },
]

export function AppSidebar({
  workspace,
  workspaces,
  user,
}: {
  workspace: Workspace
  workspaces: Workspace[]
  user: User
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { open: navOpen, setOpen: setNavOpen } = useMobileNav()
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // Persist collapse preference.
  useEffect(() => {
    try { if (localStorage.getItem('cx-sidebar-collapsed') === '1') setCollapsed(true) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('cx-sidebar-collapsed', collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  // ⌘K / Ctrl+K opens the search palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleSwitch(id: string, close: () => void) {
    if (id === workspace.id || switching) return
    setSwitching(id)
    await switchWorkspace(id)
    setSwitching(null)
    close()
    router.push('/dashboard')
    router.refresh()
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

  const rowHover = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = 'var(--cx-paper-2)'),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = ''),
  }

  return (
    <>
      {/* Mobile drawer backdrop */}
      <div
        onClick={() => setNavOpen(false)}
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${navOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(10,8,6,0.4)' }}
        aria-hidden="true"
      />
      <aside
        style={{ width: collapsed ? 64 : 240, background: 'var(--cx-paper)', borderColor: 'var(--cx-line)' }}
        className={
          'flex flex-col h-screen flex-shrink-0 overflow-hidden border-r transition-[width,transform] duration-300 ease-out ' +
          'md:sticky md:top-0 md:translate-x-0 ' +
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:!w-[264px] max-md:shadow-2xl ' +
          (navOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full')
        }
      >
        {/* Logo + collapse */}
        <div className={`flex items-center h-[58px] px-3.5 border-b flex-shrink-0 ${collapsed ? 'md:justify-center' : 'justify-between'}`}
          style={{ borderColor: 'var(--cx-line)' }}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <Image src="/CortexLogo.png" alt="Cortex" width={22} height={22} className="object-contain flex-shrink-0" />
              <span className="text-[14px] font-semibold tracking-tight truncate" style={{ color: 'var(--cx-ink)' }}>Cortex</span>
            </Link>
          )}
          <button
            onClick={() => setNavOpen(false)}
            className="md:hidden flex-shrink-0 size-9 rounded-lg flex items-center justify-center hover:bg-[var(--cx-paper-2)]"
            style={{ color: 'var(--cx-mute-2)' }}
            aria-label="Close navigation menu"
          >
            <X size={16} />
          </button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setCollapsed(v => !v)}
            className="hidden md:flex flex-shrink-0 size-8 rounded-lg items-center justify-center transition-colors"
            style={{ color: 'var(--cx-mute-2)' }}
            {...rowHover}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </motion.button>
        </div>

        {/* Workspace switcher */}
        <div className={`px-2.5 pt-3 pb-2 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          <DropdownMenu
            width={260}
            trigger={({ open, toggle }) =>
              collapsed ? (
                <button
                  onClick={toggle}
                  title={workspace.name}
                  className="size-9 rounded-lg border flex items-center justify-center"
                  style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-surface)' }}
                >
                  <Building2 size={14} style={{ color: 'var(--cx-mute-1)' }} />
                </button>
              ) : (
                <button
                  onClick={toggle}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors"
                  {...rowHover}
                >
                  <div className="min-w-0 flex-1">
                    <p className="cx-rule-label leading-none">Workspace</p>
                    <p className="text-[13px] font-semibold truncate mt-1" style={{ color: 'var(--cx-ink)' }}>
                      {workspace.name}
                    </p>
                  </div>
                  <ChevronDown
                    size={13}
                    className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--cx-mute-2)' }}
                  />
                </button>
              )
            }
          >
            {({ close }) => (
              <>
                <p className="px-2.5 pt-1.5 pb-1 cx-rule-label">Workspaces</p>
                {workspaces.map(ws => {
                  const active = ws.id === workspace.id
                  const isSwitching = switching === ws.id
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitch(ws.id, close)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                      style={{ background: active ? 'var(--cx-paper-2)' : '' }}
                      {...(!active ? rowHover : {})}
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
                      <p className="text-[12.5px] font-semibold truncate flex-1" style={{ color: 'var(--cx-ink)' }}>{ws.name}</p>
                      {active && <Check size={12} style={{ color: 'var(--cx-accent)' }} strokeWidth={2.5} className="flex-shrink-0" />}
                    </button>
                  )
                })}

                <div className="cx-hdiv mx-1 my-1" />
                {showCreate ? (
                  <div className="px-2.5 py-2">
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border"
                      style={{ borderColor: 'var(--cx-accent-line)', background: 'var(--cx-accent-wash)' }}>
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
                    {...rowHover}
                  >
                    <span className="size-6 rounded-md flex items-center justify-center flex-shrink-0 border border-dashed"
                      style={{ borderColor: 'var(--cx-line-2)' }}>
                      <Plus size={11} style={{ color: 'var(--cx-mute-2)' }} />
                    </span>
                    <p className="text-[12.5px] font-medium" style={{ color: 'var(--cx-mute-1)' }}>New workspace</p>
                  </button>
                )}
              </>
            )}
          </DropdownMenu>
        </div>

        {/* Search trigger */}
        <div className={`px-2.5 pb-2 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <button
              onClick={() => setSearchOpen(true)}
              title="Search (⌘K)"
              className="size-9 rounded-lg border flex items-center justify-center"
              style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-surface)', color: 'var(--cx-mute-1)' }}
            >
              <Search size={14} />
            </button>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 h-9 px-2.5 rounded-lg border transition-colors text-[12.5px]"
              style={{ borderColor: 'var(--cx-line)', background: 'rgba(255,255,255,0.5)', color: 'var(--cx-mute-1)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cx-accent-line)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--cx-line)')}
            >
              <Search size={13} className="flex-shrink-0" />
              <span className="flex-1 text-left">Search</span>
              <kbd className="flex items-center h-4 px-1.5 rounded border text-[10px] font-mono flex-shrink-0"
                style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)', color: 'var(--cx-mute-2)' }}>
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-1 cx-scroll-thin space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className="flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  padding: collapsed ? undefined : '8px 10px',
                  justifyContent: collapsed ? 'center' : undefined,
                  width: collapsed ? 36 : '100%',
                  height: collapsed ? 36 : undefined,
                  margin: collapsed ? '0 auto 2px' : undefined,
                  background: isActive ? 'var(--cx-ink)' : '',
                  color: isActive ? '#f2f0eb' : 'var(--cx-ink-2)',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--cx-paper-2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
              >
                <Icon size={15} className="flex-shrink-0" style={{ color: isActive ? '#d9a441' : 'var(--cx-mute-2)' }} />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* Account footer */}
        <div className={`p-2 border-t flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`} style={{ borderColor: 'var(--cx-line)' }}>
          <DropdownMenu
            align={collapsed ? 'left' : 'left'}
            width={240}
            trigger={({ toggle }) =>
              collapsed ? (
                <button onClick={toggle} className="size-9 rounded-full overflow-hidden border flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-paper-2)', color: 'var(--cx-ink)' }}>
                  {user.avatarUrl
                    ? <Image src={user.avatarUrl} alt="" width={36} height={36} className="object-cover w-full h-full" />
                    : <span>{initials}</span>}
                </button>
              ) : (
                <button onClick={toggle} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors" {...rowHover}>
                  <div className="size-8 rounded-full overflow-hidden border flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-paper-2)', color: 'var(--cx-ink)' }}>
                    {user.avatarUrl
                      ? <Image src={user.avatarUrl} alt="" width={32} height={32} className="object-cover w-full h-full" />
                      : <span>{initials}</span>}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--cx-ink)' }}>{user.name}</p>
                    <p className="text-[10.5px] truncate" style={{ color: 'var(--cx-mute-2)' }}>{user.email}</p>
                  </div>
                </button>
              )
            }
          >
            {() => (
              <>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors"
                  style={{ color: 'var(--cx-ink-2)' }}
                  {...rowHover}
                >
                  <Settings size={13} style={{ color: 'var(--cx-mute-1)' }} /> Settings
                </Link>
                <div className="cx-hdiv mx-1 my-1" />
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium text-left transition-colors"
                    style={{ color: 'var(--cx-mute-1)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(166,68,58,0.08)'; e.currentTarget.style.color = 'var(--cx-err)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--cx-mute-1)' }}
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                </form>
              </>
            )}
          </DropdownMenu>
        </div>
      </aside>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} workspaceId={workspace.id} />
    </>
  )
}
