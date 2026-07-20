'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Align = 'left' | 'right'

export function DropdownMenu({
  trigger,
  children,
  align = 'left',
  width = 260,
  panelClassName = '',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode
  children: (props: { close: () => void }) => React.ReactNode
  align?: Align
  width?: number
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside)
      document.addEventListener('keydown', onEscape)
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const close = () => setOpen(false)
  const toggle = () => setOpen(v => !v)

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            style={{ transformOrigin: align === 'right' ? 'top right' : 'top left', width }}
            className={`absolute top-[calc(100%+8px)] ${align === 'right' ? 'right-0' : 'left-0'} cx-panel p-1.5 z-50 ${panelClassName}`}
          >
            {children({ close })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
