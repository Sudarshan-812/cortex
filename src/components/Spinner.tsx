'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

/* ── Inline spinner - use anywhere ─────────────────────────────── */
export function Spinner({ size = 48 }: { size?: number }) {
  const stroke = 1.5
  const r      = (size - stroke * 2) / 2
  const circ   = 2 * Math.PI * r
  const arc    = circ * 0.27   // arc length: 27% of circumference
  const gap    = circ - arc

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Ambient glow that breathes */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: 'var(--cx-accent)', filter: `blur(${size * 0.38}px)` }}
        animate={{ scale: [1, 1.55, 1], opacity: [0.2, 0.04, 0.2] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rotating SVG arc */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'linear' }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track ring */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="var(--cx-accent-line)"
            strokeWidth={stroke}
          />
          {/* Moving arc */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="var(--cx-accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${gap}`}
            strokeDashoffset={circ * 0.25}
            style={{ filter: 'drop-shadow(0 0 3px rgba(161,98,7,0.45))' }}
          />
        </svg>
      </motion.div>

      {/* Breathing logo center */}
      <motion.div
        className="relative z-10"
        animate={{ scale: [1, 1.07, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src="/CortexLogo.png"
          alt="Cortex"
          width={Math.round(size * 0.4)}
          height={Math.round(size * 0.4)}
          className="object-contain"
        />
      </motion.div>
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
      <motion.div
        className="flex flex-col items-center gap-7"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <Spinner size={52} />

        <div className="flex flex-col items-center gap-2">
          <p
            className="text-[13px] font-semibold tracking-tight"
            style={{ color: 'var(--cx-ink)' }}
          >
            Cortex
          </p>

          {/* Three breathing dots */}
          <div className="flex items-center gap-[5px]">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="size-[3px] rounded-full"
                style={{ background: 'var(--cx-accent)' }}
                animate={{ opacity: [0.18, 1, 0.18], scale: [0.7, 1.3, 0.7] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: i * 0.22,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
