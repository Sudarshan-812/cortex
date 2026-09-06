'use client'

import { useId } from 'react'
import { ArrowUpRight } from 'lucide-react'

type MetricTileProps = {
  label: string
  value: number | string
  sub: string
  trend?: string
  spark?: number[]
  sparkColor: string
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

function MetricTile({ label, value, sub, trend, spark, sparkColor }: MetricTileProps) {
  const display = typeof value === 'number' ? value.toLocaleString() : value

  return (
    <div className="cx-panel cx-panel-hover p-5">
      <div className="flex items-start justify-between mb-4 min-h-[24px]">
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
    </div>
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
        label="Total indexed"
        value={docs}
        sub="Documents"
        sparkColor="var(--cx-accent)"
        spark={docsSpark && docsSpark.length > 1 ? docsSpark : undefined}
        trend={docsTrend}
      />
      <MetricTile
        label="Vector chunks, 768-dim"
        value={embeddings}
        sub="Embeddings"
        sparkColor="var(--cx-accent)"
      />
      <MetricTile
        label="Megabytes used"
        value={storageMB}
        sub="Storage"
        sparkColor="var(--cx-ok)"
      />
      <MetricTile
        label="Conversations started"
        value={sessions ?? 0}
        sub="Chat sessions"
        sparkColor="var(--cx-ok)"
        spark={sessionsSpark && sessionsSpark.length > 1 ? sessionsSpark : undefined}
        trend={sessionsTrend}
      />
    </div>
  )
}
