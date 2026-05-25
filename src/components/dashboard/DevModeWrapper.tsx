'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const KEY = 'cortex_dev_mode'
export const DEV_MODE_EVENT = 'cortex-dev-mode-change'

const TRANSITION = { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const }

function useSyncedDevMode() {
  const [devMode, setDevMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDevMode(localStorage.getItem(KEY) === 'true')

    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setDevMode(e.newValue === 'true')
    }
    function onCustom(e: Event) {
      setDevMode((e as CustomEvent<string>).detail === 'true')
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(DEV_MODE_EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(DEV_MODE_EVENT, onCustom)
    }
  }, [])

  return { devMode, mounted }
}

export function DevModeWrapper({ children }: { children: React.ReactNode }) {
  const { devMode, mounted } = useSyncedDevMode()
  if (!mounted) return null
  return (
    <AnimatePresence>
      {devMode && (
        <motion.div
          key="dev-content"
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.99 }}
          transition={TRANSITION}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function UserModeWrapper({ children }: { children: React.ReactNode }) {
  const { devMode, mounted } = useSyncedDevMode()
  if (!mounted) return null
  return (
    <AnimatePresence>
      {!devMode && (
        <motion.div
          key="user-content"
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.99 }}
          transition={TRANSITION}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
