import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ChatSidebar } from "@/components/chat-sidebar"
import { Navbar } from "@/components/landing/Navbar"

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const avatarUrl = user.user_metadata?.avatar_url || undefined
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User"

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })

  if (!workspaces || workspaces.length === 0) redirect("/dashboard")

  const cookieStore = await cookies()
  const activeId = cookieStore.get("cortex_active_workspace")?.value
  const workspace = workspaces.find(w => w.id === activeId) ?? workspaces[0]

  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 font-sans selection:bg-fuchsia-200">
      <Navbar isLoggedIn avatarUrl={avatarUrl} userName={userName} />
      <div className="flex flex-1 overflow-hidden mt-16">
        <ChatSidebar
          sessions={sessions ?? []}
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          workspaces={workspaces}
        />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
