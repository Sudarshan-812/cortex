import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ChatSidebar } from "@/components/chat-sidebar"
import { MobileNavProvider } from "@/components/MobileNavContext"
import { MobileHeader } from "@/components/MobileHeader"

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })

  if (!workspaces || workspaces.length === 0) redirect("/")

  const cookieStore = await cookies()
  const activeId = cookieStore.get("cortex_active_workspace")?.value
  const workspace = workspaces.find(w => w.id === activeId) ?? workspaces[0]

  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })

  return (
    <MobileNavProvider>
      <a href="#main-content" className="cx-skip-link">Skip to content</a>
      <div
        className="flex h-screen overflow-hidden font-sans"
        style={{ background: 'var(--cx-paper)', color: 'var(--cx-ink)' }}
      >
        <ChatSidebar
          sessions={sessions ?? []}
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          workspaces={workspaces}
        />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <MobileHeader title={workspace.name} />
          <main id="main-content" className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </MobileNavProvider>
  )
}
