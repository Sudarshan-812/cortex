import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Image from "next/image"
import { ChatTopBar } from "@/components/ChatTopBar"

export default async function ChatIndexPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const cookieStore = await cookies()
  const activeId = cookieStore.get("cortex_active_workspace")?.value

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })

  if (!workspaces || workspaces.length === 0) redirect("/dashboard")

  const workspace = workspaces.find(w => w.id === activeId) ?? workspaces[0]

  const { data: latest } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest) redirect(`/chat/${latest.id}`)

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--cx-paper)' }}
    >
      {/* Top bar - shared with ChatWindow */}
      <ChatTopBar subtitle="Document Chat">
        <span className="size-1.5 rounded-full" style={{ background: 'var(--cx-ok)' }} />
        <span className="text-[11.5px] cx-num" style={{ color: 'var(--cx-mute-1)' }}>Gemini Flash</span>
      </ChatTopBar>

      {/* Welcome state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-7 relative">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(161,98,7,0.05) 0%, transparent 70%)' }}
        />

        <div className="relative flex flex-col items-center gap-5 text-center max-w-sm">
          <div
            className="size-16 rounded-[1.25rem] border flex items-center justify-center"
            style={{
              background: 'var(--cx-surface)',
              borderColor: 'var(--cx-line)',
              boxShadow: '0 8px 28px rgba(161,98,7,0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
            }}
          >
            <Image src="/CortexLogo.png" alt="Cortex" width={28} height={28} className="object-contain" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="cx-display text-[22px] font-bold tracking-[-0.01em]" style={{ color: 'var(--cx-ink)' }}>
              Start a conversation
            </h2>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--cx-mute-1)' }}>
              Connect <strong style={{ color: 'var(--cx-ink)', fontWeight: 600 }}>Google Drive</strong> in Settings or upload a file, then press <strong style={{ color: 'var(--cx-ink)', fontWeight: 600 }}>New Chat</strong>. Ask anything about your documents and Cortex answers with sources.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11.5px] cx-num pt-1" style={{ color: 'var(--cx-mute-2)' }}>
            <span>Reads PDFs, Docs, Sheets &amp; more</span>
          </div>
        </div>
      </div>
    </div>
  )
}
