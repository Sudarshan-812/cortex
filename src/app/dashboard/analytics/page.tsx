import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart2 } from 'lucide-react'
import { DashboardNavbar } from '@/components/dashboard/DashboardNavbar'
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarUrl = user.user_metadata?.avatar_url || undefined
  const userName  = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
  const userEmail = user.email ?? ''

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  const cookieStore = await cookies()
  const activeId    = cookieStore.get('cortex_active_workspace')?.value
  const workspace   = workspaces?.find(w => w.id === activeId) ?? workspaces?.[0] ?? null
  if (!workspace) redirect('/dashboard')

  // Fetch documents with topics
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, size_bytes, created_at, topics')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: true })

  // Fetch chat sessions
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: true })

  // Fetch message counts per session
  const sessionIds = sessions?.map(s => s.id) ?? []
  const { data: messages } = sessionIds.length > 0
    ? await supabase
        .from('chat_messages')
        .select('id, session_id, role, created_at')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  // Build doc upload timeline (group by day)
  const docTimeline = buildDailyTimeline(
    documents?.map(d => d.created_at) ?? []
  )

  // Build message timeline (user messages only = queries)
  const queryTimeline = buildDailyTimeline(
    messages?.filter(m => m.role === 'user').map(m => m.created_at) ?? []
  )

  // Topic frequency
  const topicFreq = new Map<string, number>()
  documents?.forEach(doc => {
    if (Array.isArray(doc.topics)) {
      (doc.topics as string[]).forEach(t => topicFreq.set(t, (topicFreq.get(t) ?? 0) + 1))
    }
  })
  const topTopics = [...topicFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }))

  // Most active documents (by query relevance is not tracked, so use upload order as proxy)
  const docStats = (documents ?? []).map(doc => ({
    name: doc.name.replace(/\.(pdf|docx|doc|txt|md|csv)$/i, '').slice(0, 28),
    size_mb: Math.round((doc.size_bytes ?? 0) / 1024 / 1024 * 10) / 10,
    topics: Array.isArray(doc.topics) ? (doc.topics as string[]).length : 0,
  }))

  return (
    <div className="min-h-screen cx-grain" style={{ background: 'var(--cx-paper)', color: 'var(--cx-ink)' }}>
      <DashboardNavbar
        workspace={workspace}
        workspaces={workspaces ?? []}
        user={{ name: userName, email: userEmail, avatarUrl }}
      />

      <div className="max-w-[1240px] mx-auto px-6 pt-[88px] pb-16">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors"
                style={{ color: 'var(--cx-mute-1)' }}
              >
                <ArrowLeft size={12} />
                Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center border"
                style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
              >
                <BarChart2 size={18} style={{ color: 'var(--cx-accent)' }} />
              </div>
              <div>
                <p className="cx-rule-label mb-0.5">Analytics</p>
                <h1 className="text-[24px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>
                  {workspace.name}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <AnalyticsDashboard
          docTimeline={docTimeline}
          queryTimeline={queryTimeline}
          topTopics={topTopics}
          docStats={docStats}
          totalDocs={documents?.length ?? 0}
          totalQueries={messages?.filter(m => m.role === 'user').length ?? 0}
          totalSessions={sessions?.length ?? 0}
        />
      </div>
    </div>
  )
}

function buildDailyTimeline(dates: string[]): { date: string; count: number }[] {
  if (dates.length === 0) return []
  const counts = new Map<string, number>()
  for (const d of dates) {
    const day = d.slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  // Fill gaps with 0s for a continuous chart
  if (sorted.length < 2) return sorted.map(([date, count]) => ({ date, count }))
  const result: { date: string; count: number }[] = []
  const start = new Date(sorted[0][0])
  const end   = new Date(sorted[sorted.length - 1][0])
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return result
}
