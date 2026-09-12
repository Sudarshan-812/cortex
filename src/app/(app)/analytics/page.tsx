import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { BarChart2 } from 'lucide-react'
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard'
import { GoogleDriveCard } from '@/components/dashboard/GoogleDriveCard'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { buildDailyTimeline } from '@/lib/timeline'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  const cookieStore = await cookies()
  const activeId    = cookieStore.get('cortex_active_workspace')?.value
  const workspace   = workspaces?.find(w => w.id === activeId) ?? workspaces?.[0] ?? null
  if (!workspace) redirect('/')

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
    <div className="min-h-screen">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-10 pb-16">
        <PageHeader
          icon={<BarChart2 size={18} style={{ color: 'var(--cx-accent)' }} />}
          eyebrow="Analytics"
          title={workspace.name}
          description="Usage across documents, queries, and chat sessions in this workspace."
        />

        <GoogleDriveCard workspaceId={workspace.id} workspaceName={workspace.name} />

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
