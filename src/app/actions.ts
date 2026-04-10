'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { extractText, isSupportedFile } from "@/lib/parsers"
import { cookies } from "next/headers"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

// ── Workspace actions ──────────────────────────────────────────────────────────

export async function createNewWorkspace(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ name: name.trim(), owner_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'admin',
  })

  const cookieStore = await cookies()
  cookieStore.set('cortex_active_workspace', workspace.id, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
  })

  revalidatePath('/dashboard')
  revalidatePath('/chat')
  return { success: true, workspaceId: workspace.id }
}

export async function switchWorkspace(workspaceId: string) {
  const cookieStore = await cookies()
  cookieStore.set('cortex_active_workspace', workspaceId, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
  })
  revalidatePath('/dashboard')
  revalidatePath('/chat')
}

export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', user.id)
    .single()
  if (!ws) return { error: 'Workspace not found' }

  // Delete all document chunks + storage files
  const { data: docs } = await supabase
    .from('documents')
    .select('id, storage_path')
    .eq('workspace_id', workspaceId)

  if (docs && docs.length > 0) {
    const docIds = docs.map(d => d.id)
    await supabase.from('document_chunks').delete().in('document_id', docIds)
    await supabase.from('documents').delete().eq('workspace_id', workspaceId)
    const paths = docs.map(d => d.storage_path).filter(Boolean)
    if (paths.length > 0) await supabase.storage.from('synapse-uploads').remove(paths)
  }

  // Delete chat sessions (messages cascade via FK)
  await supabase.from('chat_sessions').delete().eq('workspace_id', workspaceId)

  // Delete workspace members + workspace
  await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId)
  await supabase.from('workspaces').delete().eq('id', workspaceId).eq('owner_id', user.id)

  // Clear cookie if it pointed to deleted workspace
  const cookieStore = await cookies()
  if (cookieStore.get('cortex_active_workspace')?.value === workspaceId) {
    cookieStore.delete('cortex_active_workspace')
  }

  revalidatePath('/dashboard')
  revalidatePath('/chat')
  return { success: true }
}

// ── Document actions ───────────────────────────────────────────────────────────

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single()

  if (!doc) return { error: 'Document not found' }

  await supabase.from('document_chunks').delete().eq('document_id', documentId)
  await supabase.from('documents').delete().eq('id', documentId)
  if (doc.storage_path) {
    await supabase.storage.from('synapse-uploads').remove([doc.storage_path])
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()

  const file = formData.get("file") as File
  const workspaceId = formData.get("workspaceId") as string

  if (!file || !workspaceId) return { error: "Missing file or workspace ID" }
  if (!isSupportedFile(file)) return { error: "Unsupported file type. Use PDF, DOCX, TXT, MD, or CSV." }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
  const filePath = `${workspaceId}/${Date.now()}_${safeName}`
  const { error: uploadError } = await supabase.storage
    .from("synapse-uploads")
    .upload(filePath, file)

  if (uploadError) return { error: `Storage error: ${uploadError.message}` }

  const { data: docData, error: dbError } = await supabase
    .from("documents")
    .insert({
      workspace_id: workspaceId,
      name: file.name,
      storage_path: filePath,
      file_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (dbError) return { error: `Database error: ${dbError.message}` }

  try {
    const rawText = await extractText(file)

    if (!rawText?.trim()) throw new Error("Extracted text is empty.")

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })
    const splitDocs = await splitter.createDocuments([rawText])

    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" })
    const chunksData = []

    for (const chunk of splitDocs) {
      const content = chunk.pageContent.replace(/\n/g, " ")
      const result = await embeddingModel.embedContent(content)
      const embedding = result.embedding.values.slice(0, 768)
      chunksData.push({ document_id: docData.id, content, embedding })
    }

    const { error: vectorError } = await supabase.from("document_chunks").insert(chunksData)
    if (vectorError) throw new Error(`Vector DB error: ${vectorError.message}`)
  } catch (err: any) {
    return { error: `Processing error: ${err.message ?? String(err)}` }
  }

  revalidatePath("/")
  return { success: true }
}
