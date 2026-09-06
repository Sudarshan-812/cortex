import { createClient } from '@/utils/supabase/server'
import { isSupportedFile } from '@/lib/parsers'
import * as Sentry from '@sentry/nextjs'
import { backendFetch, getAccessToken } from '@/lib/backend'

const MAX_FILE_BYTES = 50 * 1024 * 1024

function sse(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: object) => controller.enqueue(encoder.encode(sse(data)))

      try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const workspaceId = formData.get('workspaceId') as string | null

        if (!file || !workspaceId) {
          emit({ error: 'Missing file or workspace ID' })
          controller.close()
          return
        }
        if (file.size > MAX_FILE_BYTES) {
          emit({ error: 'File too large. Maximum size is 50 MB.' })
          controller.close()
          return
        }
        if (!isSupportedFile(file)) {
          emit({ error: 'Unsupported file type. Use PDF, DOCX, or XLSX.' })
          controller.close()
          return
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          emit({ error: 'Not authenticated' })
          controller.close()
          return
        }

        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', user.id)
          .single()
        if (!ws) {
          emit({ error: 'Workspace not found or access denied' })
          controller.close()
          return
        }

        emit({ stage: 'processing', pct: 5, label: 'Uploading file…' })

        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/, '')
        const filePath = `${workspaceId}/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('synapse-uploads')
          .upload(filePath, file)
        if (uploadError) {
          emit({ error: `Storage error: ${uploadError.message}` })
          controller.close()
          return
        }

        const { data: docData, error: dbError } = await supabase
          .from('documents')
          .insert({
            workspace_id: workspaceId,
            name: file.name,
            storage_path: filePath,
            file_type: file.type,
            size_bytes: file.size,
          })
          .select()
          .single()
        if (dbError) {
          emit({ error: `Database error: ${dbError.message}` })
          controller.close()
          return
        }

        const { data: signed, error: signErr } = await supabase.storage
          .from('synapse-uploads')
          .createSignedUrl(filePath, 600)
        if (signErr || !signed) {
          emit({ error: `Signed URL error: ${signErr?.message ?? 'unknown'}` })
          controller.close()
          return
        }

        const token = await getAccessToken()
        if (!token) {
          emit({ error: 'Not authenticated' })
          controller.close()
          return
        }

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
        if (!res.ok || !res.body) {
          const body = await res.text().catch(() => '')
          emit({ error: `Ingest failed: ${res.status} ${body}` })
          controller.close()
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const parts = buf.split('\n\n')
          buf = parts.pop() ?? ''
          for (const part of parts) {
            if (!part.startsWith('data:')) continue
            let evt: {
              stage?: string
              message?: string
              chunks?: number
              pages?: number
              pct?: number
              label?: string
            }
            try {
              evt = JSON.parse(part.slice(part.indexOf(':') + 1).trim())
            } catch {
              continue
            }
            if (evt.stage === 'error') {
              emit({ error: evt.message ?? 'Ingest error' })
            } else if (evt.stage === 'done') {
              emit({
                stage: 'embedded',
                pct: 100,
                label: 'Indexed',
                docId: docData.id,
                chunks: evt.chunks,
                pages: evt.pages,
              })
            } else {
              emit(evt) // processing / embedding progress passthrough
            }
          }
        }
        controller.close()
      } catch (err) {
        Sentry.captureException(err, { tags: { stage: 'upload_proxy' } })
        try {
          const message = err instanceof Error ? err.message : 'Upload failed'
          controller.enqueue(encoder.encode(sse({ error: message })))
          controller.close()
        } catch {}
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
