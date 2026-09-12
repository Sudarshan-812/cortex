'use client'

import { useMobileNav } from '@/components/MobileNavContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * Shared responsive shell for the app/chat sidebars: a static in-flow `<aside>`
 * at md+ widths, and a shadcn `Sheet` drawer below md (Radix gives us
 * click-outside, Escape-to-close and focus return for free - the hand-rolled
 * backdrop div this replaces had none of that). Both branches render the same
 * `children` (never both at once), so nav/session-list state, the ⌘K
 * listener, etc. only ever exist in one place at a time.
 */
export function SidebarFrame({
  collapsed,
  widthExpanded,
  widthCollapsed,
  stickyTop = false,
  className,
  ariaLabel,
  children,
}: {
  collapsed: boolean
  widthExpanded: number
  widthCollapsed: number
  stickyTop?: boolean
  className?: string
  ariaLabel: string
  children: React.ReactNode
}) {
  const { open, setOpen } = useMobileNav()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[264px] sm:max-w-[264px] gap-0 p-0 bg-background border-border"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">App navigation menu</SheetDescription>
          <div className="flex flex-col h-full">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      style={{ width: collapsed ? widthCollapsed : widthExpanded }}
      className={cn(
        'hidden md:flex flex-col flex-shrink-0 overflow-hidden border-r bg-background border-border transition-[width] duration-200 ease-out',
        stickyTop && 'md:sticky md:top-0',
        className
      )}
      aria-label={ariaLabel}
    >
      {children}
    </aside>
  )
}
