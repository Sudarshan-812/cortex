import { NextResponse, after } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isSupportedFile } from '@/lib/parsers'
import * as Sentry from '@sentry/nextjs'
import { backendFetch, getAccessToken } from '@/lib/backend'

const MAX_FILE_BYTES = 50 * 1024 * 1024

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const workspaceId = formData.get('workspaceId') as string | null

  if (!file || !workspaceId) {
    return NextResponse.json({ error: 'Missing file or workspace ID' }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 50 MB.' }, { status: 400 })
  }
  if (!isSupportedFile(file)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PDF, DOCX, or XLSX.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', user.id)
    .single()
  if (!ws) {
    return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 })
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/, '')
  const filePath = `${workspaceId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('synapse-uploads')
    .upload(filePath, file)
  if (uploadError) {
    return NextResponse.json({ error: `Storage error: ${uploadError.message}` }, { status: 500 })
  }

  const { data: docData, error: dbError } = await supabase
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      name: file.name,
      storage_path: filePath,
      file_type: file.type,
      size_bytes: file.size,
      status: 'queued',
    })
    .select()
    .single()
  if (dbError) {
    return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from('synapse-uploads')
    .createSignedUrl(filePath, 600)
  if (signErr || !signed) {
    return NextResponse.json(
      { error: `Signed URL error: ${signErr?.message ?? 'unknown'}` },
      { status: 500 }
    )
  }

  const token = await getAccessToken()
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Ingestion (parse + embed + write) can take minutes on table/image-heavy
  // PDFs on a CPU-only host - runs after the response is sent so the upload
  // itself feels instant. The Python backend is the source of truth for
  // documents.status; the client polls GET /api/documents/[id]/status
  // instead of holding this request open.
  after(async () => {
    try {
      const res = await backendFetch('/v1/ingest', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: docData.id,
          source_url: signed.signedUrl,
          filename: file.name,
          workspace_id: workspaceId,
        }),
      })
      // Drain the SSE stream so the backend can run to completion without
      // its writes backpressuring on an unread socket. Status/errors are
      // persisted by the backend itself (services/ingest.py::_set_status).
      if (res.body) {
        const reader = res.body.getReader()
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { stage: 'upload_background_ingest' } })
    }
  })

  return NextResponse.json({ documentId: docData.id, status: 'queued' })
}
