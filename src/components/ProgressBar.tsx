'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export function ProgressBar() {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startProgress() {
    setVisible(true)
    setProgress(0)

    // Simulate crawling progress up to ~85%
    let current = 0
    intervalRef.current = setInterval(() => {
      current += Math.random() * 12
      if (current >= 85) {
        current = 85
        clearInterval(intervalRef.current!)
      }
      setProgress(current)
    }, 180)
  }

  function completeProgress() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setProgress(100)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 400)
  }

  // Complete when pathname changes (navigation done)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      completeProgress()
      prevPathname.current = pathname
    }
  }, [pathname])

  // Intercept link clicks to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      // Only internal, non-hash, non-external links
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !anchor.getAttribute('target')
      ) {
        startProgress()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="progress-bar"
          className="fixed top-0 left-0 z-[9999] h-[3.5px] pointer-events-none"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #a855f7, #ec4899, #a855f7)',
            backgroundSize: '200% 100%',
          }}
          initial={{ opacity: 1, width: '0%' }}
          animate={{
            width: `${progress}%`,
            backgroundPosition: ['0% 0%', '100% 0%'],
          }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={{ width: { duration: 0.3, ease: 'easeOut' } }}
        >
          {/* Glowing tip */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-[3.5px] bg-gradient-to-l from-white/60 to-transparent blur-[1px]" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
