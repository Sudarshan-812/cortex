import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, UploadCloud, ChevronRight, Sparkles } from "lucide-react"

import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar"
import { MetricsGrid }     from "@/components/dashboard/MetricsGrid"
import { PipelineViz }     from "@/components/dashboard/PipelineViz"
import { ChatDemo }        from "@/components/dashboard/ChatDemo"
import { UploadZoneNew }   from "@/components/dashboard/UploadZoneNew"
import { SystemStatus }    from "@/components/dashboard/SystemStatus"
import { AgentsCard }      from "@/components/dashboard/AgentsCard"
import { DocumentTable }   from "@/components/dashboard/DocumentTable"

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const avatarUrl = user.user_metadata?.avatar_url || undefined
  const userName  = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"
  const userEmail = user.email ?? ""

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
            <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--cx-ink)" }}>
              Initialize Cortex
            </h1>
            <p className="text-sm mb-8" style={{ color: "var(--cx-mute-1)" }}>
              Set up your secure enterprise knowledge base.
            </p>
            <form action={initWorkspace} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="workspaceName" className="text-sm font-medium">Workspace Name</Label>
                <Input name="workspaceName" id="workspaceName" placeholder="e.g., Acme Legal Docs" required className="h-11 rounded-xl" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl font-semibold">Deploy Workspace</Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  /* ── Fetch data ───────────────────────────────────────────────── */
  const { data: documents, count: docCount } = await supabase
    .from("documents")
    .select("id, name, size_bytes, created_at", { count: "exact" })
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })

  const docIds = documents?.map(d => d.id) ?? []
  const { count: chunkCount } = docIds.length > 0
    ? await supabase.from("document_chunks").select("*", { count: "exact", head: true }).in("document_id", docIds)
    : { count: 0 }

  const { count: sessionCount } = await supabase
    .from("chat_sessions")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)

  const totalBytes = documents?.reduce((s, d) => s + (d.size_bytes ?? 0), 0) ?? 0
  const storageMB  = Math.round(totalBytes / (1024 * 1024))

  return (
    <div className="min-h-screen cx-grain" style={{ background: "var(--cx-paper)", color: "var(--cx-ink)" }}>
      <DashboardNavbar
        workspace={workspace}
        workspaces={workspaces}
        user={{ name: userName, email: userEmail, avatarUrl }}
      />

      <div className="max-w-[1240px] mx-auto px-6 pt-[88px] pb-16">

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
              className="text-[44px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.02] cx-fade-up"
              style={{ color: "var(--cx-ink)" }}
            >
              {workspace.name}
              <span className="cx-serif italic font-normal" style={{ color: "var(--cx-mute-1)" }}>.</span>
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--cx-mute-1)" }}>
              <span className="cx-num" style={{ color: "var(--cx-ink-2)" }}>{docCount ?? 0}</span>{" "}documents,{" "}
              <span className="cx-num" style={{ color: "var(--cx-ink-2)" }}>{(chunkCount ?? 0).toLocaleString()}</span>{" "}embeddings,{" "}
              and <span className="cx-num" style={{ color: "var(--cx-ink-2)" }}>{sessionCount ?? 0}</span> sessions.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="#upload-zone"
              className="cx-btn-ghost h-9 px-4 rounded-full text-[12.5px] font-medium flex items-center gap-1.5"
              style={{ color: "var(--cx-ink-2)" }}
            >
              <UploadCloud size={13} /> Upload
            </a>
            <Link href="/chat" className="cx-btn-ink h-9 px-4 rounded-full text-[12.5px] font-medium flex items-center gap-1.5">
              <Search size={13} /> Query knowledge base
            </Link>
          </div>
        </div>

        {/* Metrics grid */}
        <MetricsGrid docs={docCount ?? 0} embeddings={chunkCount ?? 0} storageMB={storageMB} sessions={sessionCount ?? 0} />

        {/* RAG pipeline visualization */}
        <PipelineViz />

        {/* Chat demo + Upload + System status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="lg:col-span-2">
            <ChatDemo />
          </div>
          <div className="flex flex-col gap-5">
            <div id="upload-zone">
              <UploadZoneNew workspaceId={workspace.id} />
            </div>
            <SystemStatus />
          </div>
        </div>

        {/* Agents + Recent queries + CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <AgentsCard />

          <div className="cx-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="cx-rule-label">Recent queries</p>
              <span className="cx-num text-[10.5px]" style={{ color: "var(--cx-mute-2)" }}>
                {Math.min(4, docCount ?? 0)}
              </span>
            </div>
            {documents && documents.length > 0 ? (
              <div className="space-y-0.5 -mx-1.5">
                {documents.slice(0, 4).map(doc => (
                  <Link
                    key={doc.id}
                    href="/chat"
                    className="flex items-center gap-2.5 px-1.5 py-2 rounded-md"
                    style={{ color: "var(--cx-ink-2)" }}
                  >
                    <Search size={12} className="flex-shrink-0" style={{ color: "var(--cx-mute-2)" }} />
                    <span className="text-[12.5px] truncate">
                      {doc.name.replace(/\.(pdf|docx|doc|txt|md|csv)$/i, "")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px]" style={{ color: "var(--cx-mute-2)" }}>No queries yet.</p>
            )}
          </div>

          {/* Dark editorial CTA */}
          <div
            className="cx-panel p-6 relative overflow-hidden flex flex-col justify-between"
            style={{
              background: "linear-gradient(145deg, var(--cx-ink) 0%, #151515 100%)",
              borderColor: "var(--cx-ink-2)",
              color: "#f2f0eb",
            }}
          >
            <div
              className="absolute -top-20 -right-20 size-56 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(162,60,122,0.35) 0%, transparent 70%)" }}
            />
            <div className="relative z-10">
              <span
                className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-[.18em]"
                style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}
              >
                <Sparkles size={10} /> New
              </span>
              <h3 className="text-[19px] font-semibold tracking-tight mt-4 leading-tight">
                Spin up a new agent
                <span className="cx-serif italic font-normal" style={{ color: "#d5a8c2" }}>.</span>
              </h3>
              <p className="text-[12.5px] mt-2 leading-relaxed" style={{ color: "rgba(242,240,235,0.55)" }}>
                Define a goal and tools — Cortex will retrieve, re-rank, and synthesize with citations.
              </p>
            </div>
            <Link
              href="/chat"
              className="relative z-10 mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium group"
              style={{ color: "#f2f0eb" }}
            >
              Create agent
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Document table */}
        {documents && documents.length > 0 && (
          <DocumentTable documents={documents} storageMB={storageMB} />
        )}
        {documents?.length === 0 && (
          <div className="cx-panel p-12 text-center">
            <p className="text-[14px] font-medium mb-1" style={{ color: "var(--cx-mute-1)" }}>No documents yet</p>
            <p className="text-[12.5px]" style={{ color: "var(--cx-mute-2)" }}>
              Upload files above to start building your knowledge base.
            </p>
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
            <span>pgvector</span>
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
