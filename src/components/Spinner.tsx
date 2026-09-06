'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'

/* ── Inline spinner - one calm rotation ────────────────────────── */
export function Spinner({ size = 48 }: { size?: number }) {
  const reduce = useReducedMotion()
  const stroke = 1.5
  const r      = (size - stroke * 2) / 2
  const circ   = 2 * Math.PI * r
  const arc    = circ * 0.27
  const gap    = circ - arc

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'linear' }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="var(--cx-accent-line)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="var(--cx-accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${gap}`}
            strokeDashoffset={circ * 0.25}
          />
        </svg>
      </motion.div>

      <div className="relative z-10">
        <Image
          src="/CortexLogo.png"
          alt="Cortex"
          width={Math.round(size * 0.4)}
          height={Math.round(size * 0.4)}
          className="object-contain opacity-80"
        />
      </div>
    </div>
  )
}

/* ── Full-page loading screen ───────────────────────────────────── */
export function PageSpinner() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--cx-paper)' }}
    >
      <div className="flex flex-col items-center gap-6">
        <Spinner size={52} />
        <p className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>
          Cortex
        </p>
      </div>
    </div>
  )
}
