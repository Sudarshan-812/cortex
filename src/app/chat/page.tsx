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

  if (!workspaces || workspaces.length === 0) redirect("/")

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
      <ChatTopBar subtitle="Chat">
        <span className="text-[11.5px] cx-num" style={{ color: 'var(--cx-mute-2)' }}>Gemini Flash</span>
      </ChatTopBar>

      {/* Welcome state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div
            className="size-11 rounded-md border flex items-center justify-center"
            style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)' }}
          >
            <Image src="/CortexLogo.png" alt="Cortex" width={22} height={22} className="object-contain" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>
              Start a conversation
            </h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--cx-mute-1)' }}>
              Connect <strong style={{ color: 'var(--cx-ink)', fontWeight: 600 }}>Google Drive</strong> in Settings or upload a file, then press <strong style={{ color: 'var(--cx-ink)', fontWeight: 600 }}>New Chat</strong>. Ask anything about your documents and Cortex answers with sources.
            </p>
          </div>

          <p className="text-[11.5px]" style={{ color: 'var(--cx-mute-2)' }}>
            Reads PDFs, Docs, Sheets &amp; more
          </p>
        </div>
      </div>
    </div>
  )
}
