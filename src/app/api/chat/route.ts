import { NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import * as Sentry from "@sentry/nextjs"
import { backendFetch, getAccessToken } from "@/lib/backend"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
const enc = new TextEncoder()

const redis = Redis.fromEnv()
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "cortex_rl",
})

function sse(data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`)
}

type Citation = { chunk_id: string; source_name: string; page_number: number | null; score: number }
type DocRel = { name: string; source_type: string | null; external_id: string | null }
type ChunkRow = {
  id: string
  content: string | null
  document_id: string | null
  documents: DocRel | DocRel[] | null
}
type BackendEvent = {
  type?: string
  text?: string
  candidates?: number
  citations?: Citation[]
  grounded?: boolean
  message?: string
}

async function enrichCitations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  citations: Citation[],
) {
  if (!citations.length) return []
  const ids = citations.map(c => c.chunk_id)
  const { data } = await supabase
    .from("document_chunks")
    .select("id, content, document_id, documents(name, source_type, external_id)")
    .in("id", ids)
  const rows = (data ?? []) as unknown as ChunkRow[]

  return citations.map(c => {
    const d = rows.find(x => x.id === c.chunk_id)
    const doc = Array.isArray(d?.documents) ? d?.documents[0] : d?.documents
    const isDrive = doc?.source_type === "gdrive" && !!doc?.external_id
    return {
      chunk_id: c.chunk_id,
      document_id: d?.document_id ?? null,
      document_name: doc?.name ?? c.source_name ?? "Unknown",
      content: d?.content ?? "",
      similarity: Math.round((c.score ?? 0) * 100),
      page_number: c.page_number ?? null,
      drive_url: isDrive ? `https://drive.google.com/file/d/${doc!.external_id}/view` : null,
    }
  })
}

export async function POST(req: NextRequest) {
  const { sessionId, workspaceId, query } = await req.json()
  if (!sessionId || !workspaceId || !query) {
    return new Response("Missing required fields", { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(user.id)
    if (!success) {
      return new Response("Too many requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      })
    }
  } catch (rlErr) {
    Sentry.captureException(rlErr, { tags: { stage: "ratelimit" } })
    // fail open
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", user.id)
    .single()
  if (!workspace) return new Response("Forbidden", { status: 403 })

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("workspace_id", workspaceId)
    .single()
  if (!session) return new Response("Forbidden", { status: 403 })

  const token = await getAccessToken()
  if (!token) return new Response("Unauthorized", { status: 401 })

  // Recent turns for multi-turn coherence (the backend /v1/query is single-shot).
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(6)
  const priorTurns = ((history ?? []) as { role: string; content: string }[])
    .reverse()
    .filter(m => m.content?.trim())
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n")
  const backendQuery = priorTurns
    ? `Conversation so far:\n${priorTurns}\n\nCurrent question: ${query}`
    : query

  let fullText = ""
  let assistantPersisted = false
  let sources: Awaited<ReturnType<typeof enrichCitations>> = []
  let answeredFrom: "documents" | "none" = "none"

  async function persistAssistant() {
    if (assistantPersisted) return
    assistantPersisted = true
    try {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: fullText || "[Response interrupted before any text was generated.]",
        sources,
        answered_from: answeredFrom,
      })
    } catch (e) {
      Sentry.captureException(e, { tags: { stage: "persist_assistant" }, extra: { sessionId } })
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "user",
          content: query,
        })

        controller.enqueue(sse({ type: "tool", name: "search_documents", status: "running" }))

        const backendRes = await backendFetch("/v1/query", token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: backendQuery, workspace_id: workspaceId, top_k: 5 }),
        })
        if (!backendRes.ok || !backendRes.body) {
          const body = await backendRes.text().catch(() => "")
          throw new Error(`backend ${backendRes.status}: ${body || "no response body"}`)
        }

        const reader = backendRes.body.getReader()
        const decoder = new TextDecoder()
        let buf = ""
        let citations: Citation[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const parts = buf.split("\n\n")
          buf = parts.pop() ?? ""

          for (const part of parts) {
            if (!part.startsWith("data:")) continue
            let evt: BackendEvent
            try {
              evt = JSON.parse(part.slice(part.indexOf(":") + 1).trim()) as BackendEvent
            } catch {
              continue
            }

            switch (evt.type) {
              case "retrieval":
                controller.enqueue(sse({
                  type: "tool", name: "search_documents", status: "done", count: evt.candidates,
                }))
                break
              case "crag":
                controller.enqueue(sse({ type: "tool", name: "relevance_check", status: "done" }))
                break
              case "rewrite":
                controller.enqueue(sse({ type: "tool", name: "query_rewrite", status: "done" }))
                break
              case "citations":
                citations = evt.citations ?? []
                break
              case "token": {
                const text = evt.text ?? ""
                fullText += text
                controller.enqueue(sse({ type: "token", text }))
                break
              }
              case "done": {
                answeredFrom = evt.grounded ? "documents" : "none"
                sources = await enrichCitations(supabase, citations)
                await persistAssistant()

                const { count } = await supabase
                  .from("chat_messages")
                  .select("*", { count: "exact", head: true })
                  .eq("session_id", sessionId)
                await supabase
                  .from("chat_sessions")
                  .update(
                    count !== null && count <= 2
                      ? { title: query.length > 52 ? query.slice(0, 49) + "..." : query }
                      : { updated_at: new Date().toISOString() }
                  )
                  .eq("id", sessionId)

                controller.enqueue(sse({ type: "done", sources, answered_from: answeredFrom }))
                break
              }
              case "error":
                throw new Error(evt.message ?? "backend error")
            }
          }
        }

        if (answeredFrom === "documents" && fullText.trim()) {
          try {
            const fu = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" })
            const fuPrompt =
              `Based on this Q&A, suggest exactly 3 short follow-up questions the user might ask next.\n` +
              `Return ONLY a JSON array of strings, no markdown.\n\n` +
              `Question: ${query}\nAnswer summary: ${fullText.slice(0, 600)}`
            const fuRes = await fu.generateContent(fuPrompt)
            const m = fuRes.response.text().match(/\[[\s\S]*?\]/)
            if (m) {
              const questions: string[] = JSON.parse(m[0])
              if (Array.isArray(questions) && questions.length) {
                controller.enqueue(sse({ type: "follow_ups", questions }))
              }
            }
          } catch (err) {
            Sentry.captureException(err, { tags: { stage: "follow_ups" }, extra: { sessionId } })
          }
        }

        controller.close()
      } catch (err) {
        Sentry.captureException(err, { tags: { stage: "chat_proxy" }, extra: { sessionId, workspaceId } })
        await persistAssistant()
        try {
          const message = err instanceof Error ? err.message : "Unknown error"
          controller.enqueue(sse({ type: "error", message }))
          controller.close()
        } catch {}
      }
    },
    async cancel() {
      await persistAssistant()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
