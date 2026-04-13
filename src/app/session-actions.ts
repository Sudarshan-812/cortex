'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function createChatSession(workspaceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ workspace_id: workspaceId, title: "New Chat" })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath("/chat")
  return { session: data }
}

export async function deleteChatSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("workspace_id, workspaces!inner(owner_id)")
    .eq("id", sessionId)
    .single()

  if (!session || (session.workspaces as any)?.owner_id !== user.id) return { error: "Not found" }

  await supabase.from("chat_sessions").delete().eq("id", sessionId)
  revalidatePath("/chat")
}
