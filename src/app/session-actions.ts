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

export async function renameChatSession(sessionId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const trimmed = title.trim().slice(0, 80)
  if (!trimmed) return { error: "Title cannot be empty" }

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("workspace_id, workspaces!inner(owner_id)")
    .eq("id", sessionId)
    .single()

  if (!session || (session.workspaces as any)?.owner_id !== user.id) return { error: "Not found" }

  await supabase.from("chat_sessions").update({ title: trimmed }).eq("id", sessionId)
  revalidatePath("/chat")
  return { success: true }
}

export async function fetchChunkContext(chunkId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Fetch the target chunk + its document (with ownership check)
  const { data: chunk } = await supabase
    .from("document_chunks")
    .select("id, content, document_id, created_at, documents!inner(name, workspace_id, workspaces!inner(owner_id))")
    .eq("id", chunkId)
    .single()

  if (!chunk) return { error: "Chunk not found" }
  const doc = chunk.documents as any
  if (doc?.workspaces?.owner_id !== user.id) return { error: "Forbidden" }

  // Fetch all chunks from same document ordered by insertion time (proxy for position)
  const { data: siblings } = await supabase
    .from("document_chunks")
    .select("id, content, created_at")
    .eq("document_id", chunk.document_id)
    .order("created_at", { ascending: true })

  const idx = (siblings ?? []).findIndex((s: any) => s.id === chunkId)
  const window = (siblings ?? []).slice(Math.max(0, idx - 1), idx + 3)

  return {
    documentName: doc?.name ?? "Document",
    targetId: chunkId,
    chunks: window.map((c: any) => ({ id: c.id, content: c.content })),
  }
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
