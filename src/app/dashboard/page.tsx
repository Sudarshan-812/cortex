import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UploadZone } from "@/components/upload-zone"
import { Navbar } from "@/components/landing/Navbar"
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher"
import { DocumentList } from "@/components/DocumentList"
import {
  FileText, Layers, Search, ChevronRight,
  Database, Zap,
} from "lucide-react"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function Dashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const avatarUrl = user.user_metadata?.avatar_url || undefined
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User"

  // ── Fetch ALL workspaces (not just one) ──────────────────────────
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })

  // ── Determine active workspace from cookie ───────────────────────
  const cookieStore = await cookies()
  const activeId = cookieStore.get("cortex_active_workspace")?.value
  const workspace =
    workspaces?.find(w => w.id === activeId) ?? workspaces?.[0] ?? null

  // ── No workspaces yet → setup screen ────────────────────────────
  if (!workspace || !workspaces || workspaces.length === 0) {
    async function initWorkspace(formData: FormData) {
      "use server"
      const name = formData.get("workspaceName") as string
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: newWorkspace, error } = await supabase
        .from("workspaces")
        .insert({ name, owner_id: user.id })
        .select()
        .single()

      if (error) return

      await supabase.from("workspace_members").insert({
        workspace_id: newWorkspace.id,
        user_id: user.id,
        role: "admin",
      })

      const cookieStore = await cookies()
      cookieStore.set("cortex_active_workspace", newWorkspace.id, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
      })

      redirect("/dashboard")
    }

    return (
      <>
        <Navbar isLoggedIn avatarUrl={avatarUrl} userName={userName} />
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans selection:bg-fuchsia-200 relative overflow-hidden pt-16">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_top,_#fdf4ff_0%,_transparent_70%)] pointer-events-none" />

          <div className="relative z-10 w-full max-w-md px-4">
            <div className="bg-white/70 backdrop-blur-xl border border-zinc-200/60 rounded-[2rem] p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
              <div className="mb-6">
                <Image src="/CortexLogo.png" alt="Cortex" width={40} height={40} className="object-contain" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 mb-1">Initialize Cortex</h1>
              <p className="text-zinc-500 text-sm mb-8">Set up your secure enterprise knowledge base.</p>

              <form action={initWorkspace} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName" className="text-sm font-medium text-zinc-700">
                    Workspace Name
                  </Label>
                  <Input
                    name="workspaceName"
                    id="workspaceName"
                    placeholder="e.g., Engineering Architecture"
                    required
                    className="h-11 bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-fuchsia-500 focus-visible:border-fuchsia-500 rounded-xl shadow-sm"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-semibold transition-colors"
                >
                  Deploy Workspace
                </Button>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Fetch documents for active workspace ─────────────────────────
  const { data: documents, count: docCount } = await supabase
    .from("documents")
    .select("id, name, size_bytes, created_at", { count: "exact" })
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })

  const docIds = documents?.map(d => d.id) ?? []
  const { count: chunkCount } = docIds.length > 0
    ? await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true })
        .in("document_id", docIds)
    : { count: 0 }

  const totalSize = documents?.reduce((sum, d) => sum + (d.size_bytes ?? 0), 0) ?? 0

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 font-sans selection:bg-fuchsia-200">

      {/* Fixed Navbar */}
      <Navbar isLoggedIn avatarUrl={avatarUrl} userName={userName} />

      {/* Subtle top gradient */}
      <div className="fixed top-0 inset-x-0 h-[360px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_#fdf4ff_0%,_transparent_100%)] pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur-md border border-zinc-200/70 shadow-sm mb-3">
              <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold tracking-widest text-zinc-600 uppercase">System Online</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{workspace.name}</h1>
            <p className="mt-1.5 text-sm text-zinc-500 font-mono">{user.email}</p>
          </div>

          <Button
            asChild
            className="h-10 bg-zinc-950 hover:bg-zinc-800 text-white rounded-full px-5 text-[13.5px] font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md self-start md:self-auto"
          >
            <Link href="/chat">
              <Search className="h-4 w-4 mr-2" />
              Query Knowledge Base
            </Link>
          </Button>
        </div>

        {/* ── Workspace switcher ────────────────────────────────────── */}
        <WorkspaceSwitcher workspaces={workspaces} activeId={workspace.id} />

        {/* ── Stat strip ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              icon: FileText,
              label: "Documents",
              value: docCount ?? 0,
              sub: "indexed files",
              color: "text-violet-500",
              bg: "bg-violet-50",
              border: "border-violet-100",
            },
            {
              icon: Layers,
              label: "Embeddings",
              value: chunkCount ?? 0,
              sub: "vector chunks",
              color: "text-fuchsia-500",
              bg: "bg-fuchsia-50",
              border: "border-fuchsia-100",
            },
            {
              icon: Database,
              label: "Storage",
              value: formatBytes(totalSize),
              sub: "total ingested",
              color: "text-blue-500",
              bg: "bg-blue-50",
              border: "border-blue-100",
            },
            {
              icon: Zap,
              label: "Pipeline",
              value: "Active",
              sub: "RAG + re-ranking",
              color: "text-emerald-500",
              bg: "bg-emerald-50",
              border: "border-emerald-100",
            },
          ].map(({ icon: Icon, label, value, sub, color, bg, border }) => (
            <div
              key={label}
              className="bg-white/60 backdrop-blur-xl border border-zinc-200/60 rounded-2xl p-5 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`size-9 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4`}>
                <Icon className={`size-4 ${color}`} />
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-950">{value}</div>
              <div className="text-[11px] font-semibold text-zinc-400 mt-0.5 uppercase tracking-wide">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Bento: upload + actions ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

          {/* Upload zone */}
          <div className="lg:col-span-2">
            <div className="h-full bg-white/60 backdrop-blur-xl border border-zinc-200/60 rounded-2xl flex flex-col overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
                <h2 className="text-[14px] font-bold text-zinc-950">Ingest Data</h2>
                <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">
                  Drop PDFs here — the pipeline chunks, embeds, and indexes automatically.
                </p>
              </div>
              <div className="flex-1 p-5">
                <UploadZone workspaceId={workspace.id} />
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <div className="bg-zinc-950 text-white rounded-2xl p-6 flex flex-col gap-4">
              <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Search className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold">Query Knowledge Base</h3>
                <p className="text-[12.5px] text-zinc-400 mt-0.5 leading-relaxed">
                  Ask questions across all your indexed documents.
                </p>
              </div>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/80 hover:text-white transition-colors group"
              >
                Open Chat
                <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-zinc-200/60 rounded-2xl p-5 flex flex-col gap-3">
              <div className="size-9 rounded-xl bg-fuchsia-50 border border-fuchsia-100 flex items-center justify-center">
                <Zap className="size-4 text-fuchsia-500" />
              </div>
              <div>
                <h3 className="text-[13.5px] font-bold text-zinc-950">Pipeline Status</h3>
                <p className="text-[12px] text-zinc-500 mt-0.5">pgvector · Gemini · BM25</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] font-semibold text-emerald-600">All systems operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Document list with delete ─────────────────────────────── */}
        {documents && documents.length > 0 && (
          <DocumentList documents={documents} />
        )}

        {documents?.length === 0 && (
          <div className="bg-white/60 backdrop-blur-xl border border-zinc-200/60 rounded-2xl p-12 text-center">
            <FileText className="size-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-zinc-500">No documents yet</p>
            <p className="text-[12.5px] text-zinc-400 mt-1">Upload files above to start building your knowledge base.</p>
          </div>
        )}
      </div>
    </div>
  )
}
