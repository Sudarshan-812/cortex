'use client'

import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { FileText, MessageSquare, BookOpen, TrendingUp } from 'lucide-react'

type Props = {
  docTimeline:    { date: string; count: number }[]
  queryTimeline:  { date: string; count: number }[]
  topTopics:      { topic: string; count: number }[]
  docStats:       { name: string; size_mb: number; topics: number }[]
  totalDocs:      number
  totalQueries:   number
  totalSessions:  number
}

const ACCENT   = '#a16207'
const ACCENT_L = 'rgba(161,98,7,0.12)'
const OK       = '#3c6e47'
const OK_L     = 'rgba(60,110,71,0.12)'

function StatCard({
  icon, label, value, sub, delay = 0
}: { icon: React.ReactNode; label: string; value: string | number; sub?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="cx-panel p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="size-9 rounded-xl flex items-center justify-center border"
          style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
        >
          {icon}
        </div>
      </div>
      <p className="cx-num text-[32px] font-bold leading-none mb-1.5" style={{ color: 'var(--cx-ink)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-[12.5px] font-medium" style={{ color: 'var(--cx-mute-1)' }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--cx-mute-2)' }}>{sub}</p>}
    </motion.div>
  )
}

function ChartPanel({
  title, label, children, delay = 0
}: { title: string; label?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="cx-panel p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="cx-rule-label mb-0.5">{label ?? 'Analytics'}</p>
          <h3 className="text-[14.5px] font-semibold" style={{ color: 'var(--cx-ink)' }}>{title}</h3>
        </div>
      </div>
      {children}
    </motion.div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="px-3 py-2 rounded-xl text-[12px] border"
      style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)', color: 'var(--cx-ink-2)' }}
    >
      <p className="cx-num mb-0.5" style={{ color: 'var(--cx-mute-2)' }}>{label}</p>
      <p className="font-semibold" style={{ color: 'var(--cx-ink)' }}>{payload[0].value}</p>
    </div>
  )
}

function fmtDate(d: string) {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

export function AnalyticsDashboard({
  docTimeline,
  queryTimeline,
  topTopics,
  docStats,
  totalDocs,
  totalQueries,
  totalSessions,
}: Props) {
  const avgQPerSession = totalSessions > 0 ? Math.round(totalQueries / totalSessions) : 0

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0}    icon={<FileText size={16}     style={{ color: ACCENT }} />} label="Documents indexed"       value={totalDocs}         sub="in this workspace" />
        <StatCard delay={0.05} icon={<MessageSquare size={16} style={{ color: ACCENT }} />} label="Total queries"           value={totalQueries}      sub="user messages sent" />
        <StatCard delay={0.1}  icon={<BookOpen size={16}     style={{ color: ACCENT }} />} label="Chat sessions"           value={totalSessions}     sub="conversations started" />
        <StatCard delay={0.15} icon={<TrendingUp size={16}   style={{ color: ACCENT }} />} label="Queries per session"     value={avgQPerSession}    sub="average" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Document uploads over time */}
        <ChartPanel title="Document uploads over time" label="Upload history" delay={0.2}>
          {docTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={docTimeline.map(d => ({ ...d, date: fmtDate(d.date) }))}>
                <defs>
                  <linearGradient id="docGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-line)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--cx-mute-2)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--cx-mute-2)' }} axisLine={false} tickLine={false} width={22} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} fill="url(#docGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-[12.5px]" style={{ color: 'var(--cx-mute-2)' }}>No upload data yet</p>
            </div>
          )}
        </ChartPanel>

        {/* Query volume over time */}
        <ChartPanel title="Query volume over time" label="Chat activity" delay={0.25}>
          {queryTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={queryTimeline.map(d => ({ ...d, date: fmtDate(d.date) }))}>
                <defs>
                  <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={OK} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={OK} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-line)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--cx-mute-2)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--cx-mute-2)' }} axisLine={false} tickLine={false} width={22} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke={OK} strokeWidth={2} fill="url(#qGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-[12.5px]" style={{ color: 'var(--cx-mute-2)' }}>No query data yet</p>
            </div>
          )}
        </ChartPanel>
      </div>

      {/* Topics + Document sizes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top topics */}
        <ChartPanel title="Top topics across knowledge base" label="Topic frequency" delay={0.3}>
          {topTopics.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topTopics}
                layout="vertical"
                margin={{ left: 0, right: 12, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--cx-mute-2)' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="topic"
                  tick={{ fontSize: 10.5, fill: 'var(--cx-ink-2)' }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={ACCENT} fillOpacity={0.75} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center">
              <p className="text-[12.5px]" style={{ color: 'var(--cx-mute-2)' }}>
                Upload documents to see topic analysis
              </p>
            </div>
          )}
        </ChartPanel>

        {/* Document size distribution */}
        <ChartPanel title="Document size (MB)" label="Storage breakdown" delay={0.35}>
          {docStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={docStats}
                layout="vertical"
                margin={{ left: 0, right: 12, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cx-line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--cx-mute-2)' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10.5, fill: 'var(--cx-ink-2)' }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="size_mb" fill={OK} fillOpacity={0.75} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center">
              <p className="text-[12.5px]" style={{ color: 'var(--cx-mute-2)' }}>No documents yet</p>
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  )
}
