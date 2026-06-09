import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export async function POST(req: NextRequest) {
  const { query, workspaceId } = await req.json()
  if (!query?.trim() || !workspaceId) {
    return NextResponse.json({ error: 'Missing query or workspaceId' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', user.id)
    .single()
  if (!ws) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
  const embedResult = await embeddingModel.embedContent(query.trim())
  const queryEmbedding = embedResult.embedding.values.slice(0, 768)

  const { data: chunks } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    query_text: query.trim(),
    match_threshold: 0.2,
    match_count: 8,
    filter_workspace_id: workspaceId,
  })

  if (!chunks || chunks.length === 0) return NextResponse.json({ results: [] })

  const ids = chunks.map((c: any) => c.id)
  const { data: details } = await supabase
    .from('document_chunks')
    .select('id, document_id, documents(name)')
    .in('id', ids)

  const results = chunks.map((chunk: any) => {
    const detail = details?.find((d: any) => d.id === chunk.id)
    return {
      chunk_id: chunk.id,
      document_id: (detail as any)?.document_id ?? null,
      document_name: ((detail as any)?.documents as any)?.name ?? 'Unknown',
      content: chunk.content,
      similarity: Math.round((chunk.similarity ?? 0) * 100),
    }
  })

  return NextResponse.json({ results })
}
