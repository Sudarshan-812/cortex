'use client'

import { useId } from 'react'

type Metric = {
  label: string
  value: number | string
  trend?: string
  spark?: number[]
}

function Sparkline({ data }: { data: number[] }) {
  const uid = useId().replace(/:/g, '')
  const w = 64, h = 18, pad = 1
  const min = Math.min(...data), max = Math.max(...data)
  const range = Math.max(1, max - min)
  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - ((d - min) / range) * (h - pad * 2),
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} className="flex-shrink-0" aria-hidden="true">
      <path d={path} fill="none" stroke="var(--cx-mute-2)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <title>{uid}</title>
    </svg>
  )
}

function Cell({ label, value, trend, spark }: Metric) {
  const display = typeof value === 'number' ? value.toLocaleString() : value
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium" style={{ color: 'var(--cx-mute-2)' }}>{label}</span>
        {spark && <Sparkline data={spark} />}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="cx-num text-[22px] font-semibold leading-none" style={{ color: 'var(--cx-ink)' }}>
          {display}
        </span>
        {trend && (
          <span className="text-[11px] cx-num" style={{ color: 'var(--cx-ok)' }}>{trend}</span>
        )}
      </div>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 mb-5 border rounded-lg overflow-hidden divide-x divide-y lg:divide-y-0 divide-[var(--cx-line)]"
      style={{ borderColor: 'var(--cx-line)', background: 'var(--cx-surface)' }}>
      <Cell label="Documents" value={docs} trend={docsTrend}
        spark={docsSpark && docsSpark.length > 1 ? docsSpark : undefined} />
      <Cell label="Passages indexed" value={embeddings} />
      <Cell label="Storage (MB)" value={storageMB} />
      <Cell label="Chat sessions" value={sessions ?? 0} trend={sessionsTrend}
        spark={sessionsSpark && sessionsSpark.length > 1 ? sessionsSpark : undefined} />
    </div>
  )
}
