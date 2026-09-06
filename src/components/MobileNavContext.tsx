'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

type Ctx = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void }

const MobileNavCtx = createContext<Ctx>({ open: false, setOpen: () => {}, toggle: () => {} })

export function useMobileNav() {
  return useContext(MobileNavCtx)
}

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const toggle = useCallback(() => setOpen(v => !v), [])

  // Close the drawer whenever the route changes.
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll while the drawer is open (mobile only).
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <MobileNavCtx.Provider value={{ open, setOpen, toggle }}>
      {children}
    </MobileNavCtx.Provider>
  )
}
