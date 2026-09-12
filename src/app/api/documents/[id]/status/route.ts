import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, status, status_message, workspace_id')
    .eq('id', id)
    .single()
  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', doc.workspace_id)
    .eq('owner_id', user.id)
    .single()
  if (!ws) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { count } = await supabase
    .from('document_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', id)

  return NextResponse.json({
    status: doc.status,
    statusMessage: doc.status_message,
    chunkCount: count ?? 0,
  })
}
