'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Home, BarChart2, Settings, MessageSquare, Search,
  LogOut, PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react'
import { switchWorkspace, createNewWorkspace } from '@/app/actions'
import { SearchModal } from '@/components/SearchModal'
import { useMobileNav } from '@/components/MobileNavContext'
import { SidebarFrame } from '@/components/sidebar/sidebar-frame'
import { useSidebarCollapse } from '@/components/sidebar/use-sidebar-collapse'
import { WorkspaceSwitcher } from '@/components/sidebar/workspace-switcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Workspace = { id: string; name: string; created_at: string }
type User = { name: string; email: string; avatarUrl?: string }

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/chat', label: 'Chat', icon: MessageSquare, exact: false },
  { href: '/analytics', label: 'Analytics', icon: BarChart2, exact: true },
  { href: '/settings', label: 'Settings', icon: Settings, exact: true },
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
  const { setOpen: setNavOpen } = useMobileNav()
  const [collapsed, setCollapsed] = useSidebarCollapse()
  const [searchOpen, setSearchOpen] = useState(false)
  const signOutFormRef = useRef<HTMLFormElement>(null)

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

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

  async function handleSwitch(id: string) {
    await switchWorkspace(id)
    router.push('/')
    router.refresh()
  }

  async function handleCreate(name: string) {
    await createNewWorkspace(name)
    router.refresh()
  }

  return (
    <>
      <SidebarFrame
        collapsed={collapsed}
        widthExpanded={232}
        widthCollapsed={60}
        stickyTop
        ariaLabel="Primary"
        className="h-screen"
      >
        {/* Logo + collapse */}
        <div className={cn('flex items-center h-[58px] px-3.5 border-b border-border flex-shrink-0', collapsed ? 'md:justify-center' : 'justify-between')}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <Image src="/CortexLogo.png" alt="Cortex" width={22} height={22} className="object-contain flex-shrink-0" />
              <span className="text-[14px] font-semibold tracking-tight truncate text-foreground">Cortex</span>
            </Link>
          )}
          <button
            onClick={() => setNavOpen(false)}
            className="md:hidden flex-shrink-0 size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary"
            aria-label="Close navigation menu"
          >
            <X size={16} />
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="hidden md:flex flex-shrink-0 size-8 rounded-md items-center justify-center text-muted-foreground transition-colors hover:bg-secondary"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Workspace switcher */}
        <div className={cn('px-2.5 pt-3 pb-2 flex-shrink-0', collapsed && 'flex justify-center')}>
          <WorkspaceSwitcher
            workspace={workspace}
            workspaces={workspaces}
            collapsed={collapsed}
            variant="full"
            onSwitch={handleSwitch}
            onCreate={handleCreate}
          />
        </div>

        {/* Search trigger */}
        <div className={cn('px-2.5 pb-2 flex-shrink-0', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <button
              onClick={() => setSearchOpen(true)}
              title="Search (⌘K)"
              className="size-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground"
            >
              <Search size={14} />
            </button>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-card text-muted-foreground transition-colors text-[12.5px] hover:border-[var(--line-2)]"
            >
              <Search size={13} className="flex-shrink-0" />
              <span className="flex-1 text-left">Search</span>
              <kbd className="flex items-center h-4 px-1.5 rounded border border-border bg-secondary text-[10px] font-mono flex-shrink-0 text-muted-foreground">
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
                className={cn(
                  'flex items-center gap-2.5 rounded-md text-[13px] transition-colors',
                  isActive ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground font-medium hover:bg-secondary'
                )}
                style={{
                  padding: collapsed ? undefined : '7px 10px',
                  justifyContent: collapsed ? 'center' : undefined,
                  width: collapsed ? 36 : '100%',
                  height: collapsed ? 36 : undefined,
                  margin: collapsed ? '0 auto 2px' : undefined,
                }}
              >
                <Icon size={15} className={cn('flex-shrink-0', isActive ? 'text-accent' : 'text-muted-foreground')} />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* Account footer */}
        <div className={cn('p-2 border-t border-border flex-shrink-0', collapsed && 'flex justify-center')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <button className="size-9 rounded-full overflow-hidden border border-border bg-secondary flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-foreground">
                  {user.avatarUrl
                    ? <Image src={user.avatarUrl} alt="" width={36} height={36} className="object-cover w-full h-full" />
                    : <span>{initials}</span>}
                </button>
              ) : (
                <button className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary">
                  <div className="size-8 rounded-full overflow-hidden border border-border bg-secondary flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-foreground">
                    {user.avatarUrl
                      ? <Image src={user.avatarUrl} alt="" width={32} height={32} className="object-cover w-full h-full" />
                      : <span>{initials}</span>}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[12.5px] font-semibold truncate text-foreground">{user.name}</p>
                    <p className="text-[10.5px] truncate text-muted-foreground">{user.email}</p>
                  </div>
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="cx-panel w-[240px] p-1.5">
              <DropdownMenuItem
                asChild
                className="gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium text-foreground/90 focus:bg-secondary focus:text-foreground"
              >
                <Link href="/settings">
                  <Settings size={13} className="text-muted-foreground" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium"
                onSelect={e => {
                  e.preventDefault()
                  signOutFormRef.current?.requestSubmit()
                }}
              >
                <LogOut size={13} /> Sign out
              </DropdownMenuItem>
              <form ref={signOutFormRef} action="/auth/signout" method="post" className="hidden" />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFrame>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} workspaceId={workspace.id} />
    </>
  )
}
