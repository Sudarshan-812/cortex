import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, UploadCloud, FileText, MessageSquare, Zap } from "lucide-react"

import { MagneticButton }   from "@/components/MagneticButton"
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
        <div className="w-full max-w-md px-4">
          <div className="cx-panel p-10">
            <div className="mb-6">
              <Image src="/CortexLogo.png" alt="Cortex" width={40} height={40} className="object-contain" />
            </div>
            <h1 className="cx-display text-2xl font-bold tracking-[-0.01em] mb-1" style={{ color: "var(--cx-ink)" }}>
              Initialize Cortex
            </h1>
            <p className="text-sm mb-8" style={{ color: "var(--cx-mute-1)" }}>
              Set up your secure enterprise knowledge base.
            </p>
            <form action={initWorkspace} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="workspaceName" className="text-sm font-medium" style={{ color: "var(--cx-ink-2)" }}>
                  Workspace Name
                </label>
                <input
                  name="workspaceName" id="workspaceName" placeholder="e.g., Acme Legal Docs" required
                  className="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-colors"
                  style={{ borderColor: "var(--cx-line)", background: "var(--cx-surface)", color: "var(--cx-ink)" }}
                />
              </div>
              <button
                type="submit"
                className="cx-btn-ink w-full h-11 rounded-xl font-semibold text-[14px]"
              >
                Deploy Workspace
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
    .select("id, name, size_bytes, created_at, summary, topics", { count: "exact" })
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })

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

  return (
    <div className="min-h-screen">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-10 pb-16">

        {/* Editorial header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="cx-dot cx-pulse-dot" style={{ background: "var(--cx-ok)" }} />
              <span className="cx-rule-label">Workspace · owner</span>
              <span className="cx-hdiv w-10 hidden sm:block" />
              <span className="cx-num text-[10.5px] hidden sm:inline" style={{ color: "var(--cx-mute-2)" }}>
                ws_{workspace.id.slice(0, 8)}
              </span>
            </div>
            <h1
              className="cx-display text-[36px] md:text-[44px] font-bold tracking-[-0.03em] leading-[1.02] cx-fade-up"
              style={{ color: "var(--cx-ink)" }}
            >
              {workspace.name}
              <span className="cx-serif italic font-normal" style={{ color: "var(--cx-mute-1)" }}>.</span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
              <span style={{ color: "var(--cx-mute-1)" }}>
                <span className="cx-num font-semibold" style={{ color: "var(--cx-ink-2)" }}>{docCount ?? 0}</span>
                {" "}document{(docCount ?? 0) !== 1 ? "s" : ""}
              </span>
              <span style={{ color: "var(--cx-line)" }}>·</span>
              <span style={{ color: "var(--cx-mute-1)" }}>
                <span className="cx-num font-semibold" style={{ color: "var(--cx-ink-2)" }}>{(chunkCount ?? 0).toLocaleString()}</span>
                {" "}embeddings
              </span>
              <span style={{ color: "var(--cx-line)" }}>·</span>
              <span style={{ color: "var(--cx-mute-1)" }}>
                <span className="cx-num font-semibold" style={{ color: "var(--cx-ink-2)" }}>{sessionCount ?? 0}</span>
                {" "}chat session{(sessionCount ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="#upload-zone"
              className="cx-btn-ghost h-9 px-4 rounded-full text-[12.5px] font-medium flex items-center gap-1.5"
              style={{ color: "var(--cx-ink-2)" }}
            >
              <UploadCloud size={13} /> Upload
            </a>
            <MagneticButton strength={0.3}>
              <Link href="/chat" className="cx-btn-ink h-9 px-4 rounded-full text-[12.5px] font-medium flex items-center gap-1.5">
                <Search size={13} /> Query knowledge base
              </Link>
            </MagneticButton>
          </div>
        </div>

        {/* ── Onboarding guide - shown only when workspace is empty ── */}
        {isEmpty && (
          <div className="cx-panel p-7 mb-6">
            <p className="cx-rule-label mb-6">How Cortex works</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  icon: <FileText size={16} />,
                  step: "01",
                  title: "Upload your documents",
                  desc: "Add PDFs, Word docs, spreadsheets, or plain text. Cortex accepts files up to 50 MB.",
                },
                {
                  icon: <Zap size={16} />,
                  step: "02",
                  title: "Cortex processes them",
                  desc: "Your documents are split into semantic chunks, embedded with Gemini, and indexed for hybrid search.",
                },
                {
                  icon: <MessageSquare size={16} />,
                  step: "03",
                  title: "Ask questions, get cited answers",
                  desc: "Query in plain English. Cortex retrieves the most relevant sections and cites every source.",
                },
              ].map(({ icon, step, title, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="cx-icon-chip cx-icon-chip-md">
                    {icon}
                  </div>
                  <div>
                    <span className="cx-num text-[10.5px] block mb-0.5" style={{ color: "var(--cx-mute-2)" }}>{step}</span>
                    <p className="text-[13.5px] font-semibold mb-1" style={{ color: "var(--cx-ink)" }}>{title}</p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--cx-mute-1)" }}>{desc}</p>
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

        {/* Upload zone + knowledge graph - paired side by side on desktop */}
        {hasKnowledgeGraph ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6 items-stretch">
            <div className="lg:col-span-5" id="upload-zone">
              <UploadZoneNew workspaceId={workspace.id} />
            </div>
            <div className="lg:col-span-7">
              <KnowledgeGraph documents={documents!} />
            </div>
          </div>
        ) : (
          <div className="mb-6" id="upload-zone">
            <UploadZoneNew workspaceId={workspace.id} />
          </div>
        )}

        {/* Document table */}
        {documents && documents.length > 0 && (
          <DocumentTable documents={documents} storageMB={storageMB} />
        )}
        {isEmpty && (
          <div
            className="cx-panel p-10 text-center border-dashed"
            style={{ borderStyle: "dashed" }}
          >
            <div className="cx-icon-chip cx-icon-chip-xl mx-auto mb-4">
              <UploadCloud size={22} />
            </div>
            <p className="cx-display text-[16px] font-bold tracking-[-0.01em] mb-1" style={{ color: "var(--cx-ink)" }}>
              No documents yet
            </p>
            <p className="text-[12.5px] mb-4" style={{ color: "var(--cx-mute-2)" }}>
              Upload a file above to start building your knowledge base.
            </p>
            <a
              href="#upload-zone"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[12.5px] font-medium border transition-colors duration-150"
              style={{ borderColor: "var(--cx-line)", color: "var(--cx-ink-2)", background: "var(--cx-paper-2)" }}
            >
              <UploadCloud size={12} /> Upload your first document
            </a>
          </div>
        )}

        {/* Footer */}
        <footer
          className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "var(--cx-line)" }}
        >
          <div className="flex items-center gap-2.5">
            <Image src="/CortexLogo.png" alt="Cortex" width={18} height={18} className="object-contain" />
            <span className="text-[12px] font-semibold" style={{ color: "var(--cx-ink-2)" }}>Cortex</span>
            <span className="cx-num text-[10.5px]" style={{ color: "var(--cx-mute-2)" }}>v2.0</span>
          </div>
          <div className="flex items-center gap-5 text-[10.5px] font-mono" style={{ color: "var(--cx-mute-2)" }}>
            <span>pgvector · BM25 · RRF</span>
            <span>Gemini</span>
            <span>Supabase</span>
            <span className="flex items-center gap-1.5">
              <span className="cx-dot cx-pulse-dot" style={{ background: "var(--cx-ok)" }} />
              <span>production</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
