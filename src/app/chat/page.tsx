import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Image from "next/image"

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
      {/* Top bar matching ChatWindow header */}
      <div
        className="flex-shrink-0 flex items-center justify-between h-[50px] px-5 border-b"
        style={{ background: 'var(--cx-paper)', borderColor: 'var(--cx-line)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="size-6 rounded-lg flex items-center justify-center border flex-shrink-0"
            style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
          >
            <Image src="/CortexLogo.png" alt="Cortex" width={12} height={12} className="object-contain" />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--cx-ink)' }}>Cortex</span>
          <span className="text-[11px]" style={{ color: 'var(--cx-mute-2)' }}>·</span>
          <span className="text-[12px]" style={{ color: 'var(--cx-mute-1)' }}>Document Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full" style={{ background: 'var(--cx-ok)' }} />
          <span className="text-[11.5px] cx-num" style={{ color: 'var(--cx-mute-1)' }}>Gemini Flash</span>
        </div>
      </div>

      {/* Welcome state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-7 relative">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(122,31,90,0.05) 0%, transparent 70%)' }}
        />

        <div className="relative flex flex-col items-center gap-5 text-center max-w-sm">
          <div
            className="size-16 rounded-[1.25rem] border flex items-center justify-center"
            style={{
              background: 'var(--cx-surface)',
              borderColor: 'var(--cx-line)',
              boxShadow: '0 8px 28px rgba(122,31,90,0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
            }}
          >
            <Image src="/CortexLogo.png" alt="Cortex" width={28} height={28} className="object-contain" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>
              Start a conversation
            </h2>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--cx-mute-1)' }}>
              Click <strong style={{ color: 'var(--cx-ink)', fontWeight: 600 }}>Upload Document</strong> in the sidebar to add files, then press <strong style={{ color: 'var(--cx-ink)', fontWeight: 600 }}>New Chat</strong> to begin asking questions.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11.5px] cx-num pt-1" style={{ color: 'var(--cx-mute-2)' }}>
            <span>PDF</span>
            <span style={{ color: 'var(--cx-line-2)' }}>·</span>
            <span>DOCX</span>
            <span style={{ color: 'var(--cx-line-2)' }}>·</span>
            <span>TXT</span>
            <span style={{ color: 'var(--cx-line-2)' }}>·</span>
            <span>MD</span>
            <span style={{ color: 'var(--cx-line-2)' }}>·</span>
            <span>CSV</span>
          </div>
        </div>
      </div>
    </div>
  )
}
