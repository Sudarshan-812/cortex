import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ChatWindow } from "@/components/chat-window"

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Resolve active workspace from cookie (supports multiple workspaces)
  const cookieStore = await cookies()
  const activeId = cookieStore.get("cortex_active_workspace")?.value

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })

  if (!workspaces || workspaces.length === 0) redirect("/dashboard")

  // The session itself tells us which workspace it belongs to — use that
  // as the source of truth so switching workspace doesn't break open tabs.
  const workspace = workspaces.find(w => w.id === activeId) ?? workspaces[0]

  if (!workspace) redirect("/")

  // Verify this session belongs to the user's workspace
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id, title")
    .eq("id", sessionId)
    .eq("workspace_id", workspace.id)
    .single()

  if (!session) redirect("/chat")

  // Load persisted messages
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content, sources")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })

  return (
    <ChatWindow
      sessionId={session.id}
      workspaceId={workspace.id}
      initialMessages={(messages ?? []) as any}
    />
  )
}
