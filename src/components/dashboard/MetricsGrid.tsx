'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

type MetricTileProps = {
  label: string
  value: number | string
  sub: string
  trend?: string
  spark?: number[]
  sparkColor: string
  delay?: number
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const uid = useId()
  const gid = `sg-${uid.replace(/:/g, '')}`
  const w = 84, h = 24, pad = 2
  const min = Math.min(...data), max = Math.max(...data)
  const range = Math.max(1, max - min)
  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - ((d - min) / range) * (h - pad * 2),
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${path} L ${pts[pts.length - 1].x},${h - pad} L ${pts[0].x},${h - pad} Z`
  return (
    <svg width={w} height={h} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const from = prev.current
    prev.current = target
    let start: number, raf: number
    function step(ts: number) {
      if (!start) start = ts
      const t = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4)
      setVal(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

function MetricTile({ label, value, sub, trend, spark, sparkColor, delay = 0 }: MetricTileProps) {
  const isNum = typeof value === 'number'
  const counted = useCountUp(isNum ? value : 0)
  const display = isNum ? counted.toLocaleString() : value

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="cx-panel cx-panel-hover p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="cx-rule-label">{sub}</span>
        {spark && <Sparkline data={spark} color={sparkColor} />}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="cx-num text-[32px] font-semibold leading-none tracking-tight" style={{ color: 'var(--cx-ink)' }}>
          {display}
        </div>
        {trend && (
          <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold cx-num" style={{ color: 'var(--cx-ok)' }}>
            <ArrowUpRight size={9} strokeWidth={2.5} />{trend}
          </span>
        )}
      </div>
      <div className="text-[13px] mt-2" style={{ color: 'var(--cx-mute-1)' }}>{label}</div>
    </motion.div>
  )
}

export function MetricsGrid({
  docs,
  embeddings,
  storageMB,
  sessions,
  docsTrend,
  docsSpark,
  sessionsTrend,
  sessionsSpark,
}: {
  docs: number
  embeddings: number
  storageMB: number
  sessions?: number
  docsTrend?: string
  docsSpark?: number[]
  sessionsTrend?: string
  sessionsSpark?: number[]
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricTile
        delay={0}
        label="Documents embedded"
        value={docs}
        sub="Corpus"
        sparkColor="var(--cx-accent)"
        spark={docsSpark && docsSpark.length > 1 ? docsSpark : undefined}
        trend={docsTrend}
      />
      <MetricTile
        delay={0.05}
        label="Vector embeddings"
        value={embeddings}
        sub="pgvector · 768-dim"
        sparkColor="var(--cx-accent)"
      />
      <MetricTile
        delay={0.1}
        label="Storage used"
        value={storageMB}
        sub="Storage · MB"
        sparkColor="var(--cx-ok)"
      />
      <MetricTile
        delay={0.15}
        label="Chat sessions"
        value={sessions ?? 0}
        sub="Sessions · all time"
        sparkColor="var(--cx-ok)"
        spark={sessionsSpark && sessionsSpark.length > 1 ? sessionsSpark : undefined}
        trend={sessionsTrend}
      />
    </div>
  )
}
