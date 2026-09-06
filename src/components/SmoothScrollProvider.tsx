'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'

// These routes have their own scroll containers - Lenis must not run on them
const LENIS_DISABLED_PREFIXES = ['/chat', '/dashboard', '/login']

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const enabled = !LENIS_DISABLED_PREFIXES.some(p => pathname.startsWith(p))

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    // Kept for the marketing surface only (disabled on app routes above).
    // Tuned close to native so wheel/trackpad momentum still feels like the OS.
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1,
    })

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [enabled])

  return <>{children}</>
}
