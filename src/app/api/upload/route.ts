import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { extractText, isSupportedFile } from '@/lib/parsers'
import * as Sentry from '@sentry/nextjs'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

const MAX_FILE_BYTES = 50 * 1024 * 1024
const EMBED_BATCH = 5

function sse(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: object) {
        controller.enqueue(encoder.encode(sse(data)))
      }

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
          emit({ error: 'Unsupported file type. Use PDF, DOCX, TXT, MD, or CSV.' })
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

        // Stage 1: Upload to storage
        emit({ stage: 'processing', pct: 8, label: 'Uploading file…' })

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

        // Stage 2: Extract text
        emit({ stage: 'processing', pct: 18, label: 'Extracting text…' })
        const rawText = await extractText(file)
        if (!rawText?.trim()) {
          emit({ error: 'Extracted text is empty.' })
          controller.close()
          return
        }

        // Stage 3: Chunk
        emit({ stage: 'chunking', pct: 30, label: 'Chunking document…' })
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })
        const splitDocs = await splitter.createDocuments([rawText])
        const totalBatches = Math.ceil(splitDocs.length / EMBED_BATCH)

        emit({ stage: 'chunking', pct: 38, label: `${splitDocs.length} chunks ready` })

        // Stage 4: Embed (real per-batch progress)
        const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
        const chunksData: { document_id: string; content: string; embedding: number[] }[] = []

        for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
          const batch = splitDocs.slice(batchIdx * EMBED_BATCH, (batchIdx + 1) * EMBED_BATCH)
          const results = await Promise.all(
            batch.map(async (chunk) => {
              const content = chunk.pageContent.replace(/\n/g, ' ')
              const result = await embeddingModel.embedContent(content)
              return { document_id: docData.id, content, embedding: result.embedding.values.slice(0, 768) }
            })
          )
          chunksData.push(...results)
          const pct = 40 + Math.round(((batchIdx + 1) / totalBatches) * 48)
          emit({
            stage: 'embedding',
            pct,
            label: `Embedding batch ${batchIdx + 1}/${totalBatches}`,
            chunk: batchIdx + 1,
            total: totalBatches,
          })
        }

        // Stage 5: Insert chunks
        emit({ stage: 'embedding', pct: 90, label: 'Indexing vectors…' })
        const { error: vectorError } = await supabase.from('document_chunks').insert(chunksData)
        if (vectorError) {
          emit({ error: `Vector DB error: ${vectorError.message}` })
          controller.close()
          return
        }

        // Done — close the stream; summary runs after
        emit({ stage: 'embedded', pct: 100, label: 'Indexed', docId: docData.id })
        controller.close()

        // Auto-summary: fire-and-forget after stream is closed
        ;(async () => {
          try {
            const summaryModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
            const preview = rawText.slice(0, 4000)
            const summaryResult = await summaryModel.generateContent(
              `Summarize this document in exactly 2 sentences, then list exactly 5 key topics.\n` +
              `Return ONLY valid JSON: {"summary":"...","topics":["t1","t2","t3","t4","t5"]}\n\nDocument:\n${preview}`
            )
            const text = summaryResult.response.text()
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              if (parsed.summary && Array.isArray(parsed.topics)) {
                await supabase
                  .from('documents')
                  .update({ summary: parsed.summary, topics: parsed.topics })
                  .eq('id', docData.id)
              }
            }
          } catch (err) {
            Sentry.captureException(err, { tags: { stage: 'auto_summary' }, extra: { docId: docData.id } })
          }
        })()
      } catch (err: any) {
        Sentry.captureException(err, { tags: { stage: 'upload_sse' } })
        try {
          controller.enqueue(encoder.encode(sse({ error: err.message ?? 'Upload failed' })))
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
