import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, FileText, MessageSquare, Zap, HardDrive } from "lucide-react"

import { UploadTriggerButton } from "@/components/dashboard/UploadTriggerButton"
import { MetricsGrid }      from "@/components/dashboard/MetricsGrid"
import { UploadZoneNew }    from "@/components/dashboard/UploadZoneNew"
import { DocumentTable }    from "@/components/dashboard/DocumentTable"
import { KnowledgeGraph }   from "@/components/dashboard/KnowledgeGraph"
import { buildDailyTimeline } from "@/lib/timeline"

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })

  const cookieStore = await cookies()
  const activeId    = cookieStore.get("cortex_active_workspace")?.value
  const workspace   = workspaces?.find(w => w.id === activeId) ?? workspaces?.[0] ?? null

  /* ── No workspace ─────────────────────────────────────────────── */
  if (!workspace || !workspaces || workspaces.length === 0) {
    async function initWorkspace(formData: FormData) {
      "use server"
      const name = formData.get("workspaceName") as string
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: newWorkspace, error } = await supabase
        .from("workspaces").insert({ name, owner_id: user.id }).select().single()
      if (error) return
      await supabase.from("workspace_members").insert({
        workspace_id: newWorkspace.id, user_id: user.id, role: "admin",
      })
      const cookieStore = await cookies()
      cookieStore.set("cortex_active_workspace", newWorkspace.id, {
        maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax",
      })
      redirect("/dashboard")
    }
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--cx-paper)" }}>
        <div className="w-full max-w-sm px-4">
          <div className="cx-panel p-6">
            <div className="mb-5">
              <Image src="/CortexLogo.png" alt="Cortex" width={28} height={28} className="object-contain" />
            </div>
            <h1 className="text-[17px] font-semibold tracking-tight mb-1" style={{ color: "var(--cx-ink)" }}>
              Create your workspace
            </h1>
            <p className="text-[13px] mb-5" style={{ color: "var(--cx-mute-1)" }}>
              Give it a name and you&apos;re ready to add documents.
            </p>
            <form action={initWorkspace} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="workspaceName" className="text-[12.5px] font-medium" style={{ color: "var(--cx-ink-2)" }}>
                  Workspace name
                </label>
                <input
                  name="workspaceName" id="workspaceName" placeholder="e.g. Acme Legal Docs" required
                  className="w-full h-9 rounded-md border px-3 text-[13px] outline-none transition-colors focus:border-[var(--cx-line-2)]"
                  style={{ borderColor: "var(--cx-line)", background: "var(--cx-surface)", color: "var(--cx-ink)" }}
                />
              </div>
              <button
                type="submit"
                className="cx-btn-ink w-full h-9 rounded-md font-medium text-[13px]"
              >
                Create workspace
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  /* ── Fetch data ───────────────────────────────────────────────── */
  const { data: documents, count: docCount } = await supabase
    .from("documents")
    .select("id, name, size_bytes, created_at, summary, topics, source_type, external_id, last_synced_at", { count: "exact" })
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })

  const { data: driveConn } = await supabase
    .from("connector_accounts")
    .select("id, drive_sync_state(last_synced_at, last_status)")
    .eq("provider", "gdrive")
    .eq("workspace_id", workspace.id)
    .maybeSingle()
  const driveSync = Array.isArray(driveConn?.drive_sync_state)
    ? driveConn?.drive_sync_state[0]
    : driveConn?.drive_sync_state

  const docIds = documents?.map(d => d.id) ?? []
  const { count: chunkCount } = docIds.length > 0
    ? await supabase.from("document_chunks").select("*", { count: "exact", head: true }).in("document_id", docIds)
    : { count: 0 }

  const { data: sessions, count: sessionCount } = await supabase
    .from("chat_sessions")
    .select("id, created_at", { count: "exact" })
    .eq("workspace_id", workspace.id)

  const totalBytes = documents?.reduce((s, d) => s + (d.size_bytes ?? 0), 0) ?? 0
  const storageMB  = Math.round(totalBytes / (1024 * 1024))
  const isEmpty    = (docCount ?? 0) === 0

  // Real timelines from actual created_at timestamps - no fake/hardcoded data.
  const docsTimeline     = buildDailyTimeline((documents ?? []).map(d => d.created_at).reverse())
  const sessionsTimeline = buildDailyTimeline((sessions ?? []).map(s => s.created_at))

  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const docsThisWeek     = (documents ?? []).filter(d => now - new Date(d.created_at).getTime() < weekMs).length
  const sessionsThisWeek = (sessions ?? []).filter(s => now - new Date(s.created_at).getTime() < weekMs).length
  const hasKnowledgeGraph = (documents ?? []).some(d => Array.isArray(d.topics) && d.topics.length > 0)

  const driveSyncedAgo = (() => {
    if (!driveSync?.last_synced_at) return null
    const m = Math.floor((now - new Date(driveSync.last_synced_at).getTime()) / 60000)
    return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`
  })()

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-5 border-b" style={{ borderColor: "var(--cx-line)" }}>
          <div className="min-w-0">
            <p className="text-[11px] font-medium mb-1" style={{ color: "var(--cx-mute-2)" }}>Workspace</p>
            <h1 className="text-[20px] font-semibold tracking-tight leading-tight truncate" style={{ color: "var(--cx-ink)" }}>
              {workspace.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" style={{ color: "var(--cx-mute-1)" }}>
              <span><span className="cx-num" style={{ color: "var(--cx-ink-2)" }}>{docCount ?? 0}</span> document{(docCount ?? 0) !== 1 ? "s" : ""}</span>
              <span style={{ color: "var(--cx-line-2)" }}>·</span>
              <span><span className="cx-num" style={{ color: "var(--cx-ink-2)" }}>{(chunkCount ?? 0).toLocaleString()}</span> passages</span>
              <span style={{ color: "var(--cx-line-2)" }}>·</span>
              <span><span className="cx-num" style={{ color: "var(--cx-ink-2)" }}>{sessionCount ?? 0}</span> chat{(sessionCount ?? 0) !== 1 ? "s" : ""}</span>
              {driveConn && (
                <>
                  <span style={{ color: "var(--cx-line-2)" }}>·</span>
                  <Link href="/dashboard/settings#google-drive" className="inline-flex items-center gap-1 hover:underline">
                    <HardDrive size={11} style={{ color: "var(--cx-accent)" }} />
                    Drive {driveSyncedAgo ? `· ${driveSyncedAgo}` : "· not synced"}
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEmpty ? (
              <>
                <UploadTriggerButton
                  label="Upload files"
                  className="cx-btn-ghost h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5"
                />
                <Link
                  href="/dashboard/settings#google-drive"
                  className="cx-btn-ink h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5"
                >
                  <HardDrive size={13} /> Connect Google Drive
                </Link>
              </>
            ) : (
              <>
                <UploadTriggerButton
                  className="cx-btn-ghost h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5"
                />
                <Link href="/chat" className="cx-btn-ink h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5">
                  <Search size={13} /> Ask a question
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Empty-workspace onboarding */}
        {isEmpty && (
          <div className="cx-panel p-5 mb-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] mb-4" style={{ color: "var(--cx-mute-2)" }}>Getting started</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
              {[
                { icon: <FileText size={14} />, step: "1", title: "Connect Google Drive", desc: "Link a Drive folder in Settings, or upload PDF, DOCX or XLSX files directly." },
                { icon: <Zap size={14} />, step: "2", title: "Cortex reads your files", desc: "Each document is parsed, split into passages, and indexed so it can be searched by meaning." },
                { icon: <MessageSquare size={14} />, step: "3", title: "Ask, get cited answers", desc: "Ask in plain language. Cortex pulls the relevant passages and links every claim to its source." },
              ].map(({ icon, step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="cx-icon-chip cx-icon-chip-md">{icon}</div>
                  <div>
                    <p className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--cx-ink)" }}>
                      <span style={{ color: "var(--cx-mute-2)" }}>{step}.</span> {title}
                    </p>
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--cx-mute-1)" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real metrics - computed from actual workspace data */}
        {!isEmpty && (
          <MetricsGrid
            docs={docCount ?? 0}
            embeddings={chunkCount ?? 0}
            storageMB={storageMB}
            sessions={sessionCount ?? 0}
            docsTrend={docsThisWeek > 0 ? `+${docsThisWeek} this week` : undefined}
            docsSpark={docsTimeline.map(d => d.count)}
            sessionsTrend={sessionsThisWeek > 0 ? `+${sessionsThisWeek} this week` : undefined}
            sessionsSpark={sessionsTimeline.map(d => d.count)}
          />
        )}

        {/* Upload zone - consistent full width so the layout doesn't reflow
            when the first document finishes analysing. */}
        <div className="mb-5" id="upload-zone">
          <UploadZoneNew workspaceId={workspace.id} />
        </div>

        {hasKnowledgeGraph && (
          <div className="mb-5">
            <KnowledgeGraph documents={documents!} />
          </div>
        )}

        {/* Document table */}
        {documents && documents.length > 0 && (
          <DocumentTable documents={documents} storageMB={storageMB} />
        )}

        <footer
          className="mt-10 pt-4 border-t flex items-center gap-2 text-[11px]"
          style={{ borderColor: "var(--cx-line)", color: "var(--cx-mute-2)" }}
        >
          <span className="cx-dot" style={{ background: "var(--cx-ok)" }} />
          <span>All systems operational</span>
        </footer>
      </div>
    </div>
  )
}
