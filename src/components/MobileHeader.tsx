'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useMobileNav } from '@/components/MobileNavContext'

/** Mobile-only top bar with a hamburger. Hidden at md+ where the sidebar is in-flow. */
export function MobileHeader({ title = 'Cortex' }: { title?: string }) {
  const { toggle } = useMobileNav()
  return (
    <header
      className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-3 border-b"
      style={{ background: 'var(--cx-paper)', borderColor: 'var(--cx-line)' }}
    >
      <button
        onClick={toggle}
        aria-label="Open navigation menu"
        className="size-10 rounded-lg flex items-center justify-center hover:bg-[var(--cx-paper-2)]"
        style={{ color: 'var(--cx-ink-2)' }}
      >
        <Menu size={18} />
      </button>
      <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
        <Image src="/CortexLogo.png" alt="" width={20} height={20} className="object-contain flex-shrink-0" />
        <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--cx-ink)' }}>{title}</span>
      </Link>
    </header>
  )
}
