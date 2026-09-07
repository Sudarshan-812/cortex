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

  const cookieStore = await cookies()
  const activeId = cookieStore.get("cortex_active_workspace")?.value

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })

  if (!workspaces || workspaces.length === 0) redirect("/")

  const workspace = workspaces.find(w => w.id === activeId) ?? workspaces[0]

  if (!workspace) redirect("/")

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id, title")
    .eq("id", sessionId)
    .eq("workspace_id", workspace.id)
    .single()

  if (!session) redirect("/chat")

  const [messagesResult, documentsResult] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, role, content, sources, created_at, answered_from")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("documents")
      .select("name")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const docNames = documentsResult.data?.map(d => d.name) ?? []

  return (
    <ChatWindow
      sessionId={session.id}
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      docNames={docNames}
      initialMessages={(messagesResult.data ?? []) as any}
      hasDocuments={docNames.length > 0}
    />
  )
}
