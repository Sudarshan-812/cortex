'use client'

import { useEffect, useRef } from 'react'

/**
 * Accessibility plumbing for any overlay: Escape-to-close, focus trap,
 * body-scroll lock, and focus restoration to the trigger on close.
 * Returns a ref to put on the dialog container element.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    returnFocusRef.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !containerRef.current) return
      const focusables = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => el.offsetParent !== null)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !containerRef.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    const t = window.setTimeout(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(
        '[data-autofocus], input:not([type="hidden"]), textarea, button, a[href]',
      )
      el?.focus()
    }, 20)

    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(t)
      returnFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  return containerRef
}
