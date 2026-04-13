import { NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
const enc = new TextEncoder()

function sse(data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`)
}

async function searchDocuments(
  query: string,
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" })
  const embedResult = await embeddingModel.embedContent(query)
  const queryEmbedding = embedResult.embedding.values.slice(0, 768)

  const { data: chunks, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    query_text: query,
    match_threshold: 0.3,
    match_count: 10,
    filter_workspace_id: workspaceId,
  })

  if (error || !chunks || chunks.length === 0) return { text: "", sources: [] }

  let topChunks: any[] = chunks
  if (chunks.length > 3) {
    try {
      const rerankModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" })
      const rerankPrompt = `Score each passage's relevance to the question 1–10.
Return ONLY a JSON array like [{"index":0,"score":8},...], nothing else.

Question: ${query}

Passages:
${chunks.map((c: any, i: number) => `[${i}] ${c.content.slice(0, 250)}`).join("\n\n")}`

      const rerankResult = await rerankModel.generateContent(rerankPrompt)
      const match = rerankResult.response.text().match(/\[[\s\S]*?\]/)
      if (match) {
        const scores: { index: number; score: number }[] = JSON.parse(match[0])
        topChunks = scores
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(s => chunks[s.index])
          .filter(Boolean)
      } else {
        topChunks = chunks.slice(0, 3)
      }
    } catch {
      topChunks = chunks.slice(0, 3)
    }
  }

  const { data: details } = await supabase
    .from("document_chunks")
    .select("id, document_id, documents(name)")
    .in("id", topChunks.map((c: any) => c.id))

  const sources = topChunks.map((chunk: any) => {
    const detail = details?.find((d: any) => d.id === chunk.id)
    return {
      chunk_id: chunk.id,
      document_id: detail?.document_id ?? null,
      document_name: (detail?.documents as any)?.name ?? "Unknown",
      content: chunk.content,
      similarity: Math.round((chunk.similarity ?? 0) * 100),
    }
  })

  return { text: sources.map(s => s.content).join("\n\n"), sources }
}

async function searchWeb(query: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return "Web search unavailable (no TAVILY_API_KEY configured)."

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query, max_results: 4, search_depth: "basic" }),
  })
  const data = await res.json()
  return (
    data.results?.map((r: any) => `${r.title}\n${r.content}`).join("\n\n---\n\n") ??
    "No web results found."
  )
}

export async function POST(req: NextRequest) {
  const { sessionId, workspaceId, query } = await req.json()

  if (!sessionId || !workspaceId || !query) {
    return new Response("Missing required fields", { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "user",
          content: query,
        })

        const { data: history } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(7)

        const geminiHistory = (history ?? [])
          .reverse()
          .slice(0, -1)
          .filter((m: any) => m.content?.trim())
          .map((m: any) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          }))

        const allSources: any[] = []
        const gatheredContext: string[] = []

        controller.enqueue(sse({ type: "tool", name: "search_documents", status: "running" }))
        const docResults = await searchDocuments(query, workspaceId, supabase)
        allSources.push(...docResults.sources)
        if (docResults.text) gatheredContext.push(docResults.text)
        controller.enqueue(sse({
          type: "tool",
          name: "search_documents",
          status: "done",
          count: docResults.sources.length,
        }))

        const agentModel = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite-preview",
          systemInstruction: `You are Cortex, a document intelligence assistant.
Document search has already been completed for the user's question.
${docResults.sources.length > 0
  ? `Found ${docResults.sources.length} relevant document chunk(s).`
  : "No relevant content was found in the user's documents."}

Your only job now: decide if a web search would add meaningful value.
- Call search_web if the documents lack sufficient info OR the question needs current/real-time data.
- If the documents are sufficient, do NOT call any tool — just respond with the word "proceed".`,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "search_web",
                  description: "Search the web for current events or information not found in documents.",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      query: { type: SchemaType.STRING, description: "The web search query" },
                    },
                    required: ["query"],
                  },
                },
              ],
            },
          ],
        })

        const agentChat = agentModel.startChat({ history: geminiHistory })
        const agentResponse = await agentChat.sendMessage(query)
        const agentParts = agentResponse.response.candidates?.[0]?.content?.parts ?? []
        const webCall = agentParts.find((p: any) => p.functionCall?.name === "search_web")

        if (webCall) {
          controller.enqueue(sse({ type: "tool", name: "search_web", status: "running" }))
          const webQuery = (webCall.functionCall?.args as { query?: string } | undefined)?.query ?? query
          const webResult = await searchWeb(webQuery)
          if (webResult) gatheredContext.push(webResult)
          controller.enqueue(sse({ type: "tool", name: "search_web", status: "done" }))
        }

        const context = gatheredContext.join("\n\n")
        const finalPrompt = context
          ? `Use the context below to answer the question accurately and concisely. Cite specifics from the context where possible.\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`
          : `Answer this question as helpfully as possible: ${query}`

        const streamModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" })
        const streamResult = await streamModel.generateContentStream(finalPrompt)

        let fullText = ""
        for await (const chunk of streamResult.stream) {
          const text = chunk.text()
          if (text) {
            fullText += text
            controller.enqueue(sse({ type: "token", text }))
          }
        }

        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: fullText,
          sources: allSources,
        })

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

        controller.enqueue(sse({ type: "done", sources: allSources }))
        controller.close()
      } catch (err: any) {
        controller.enqueue(sse({ type: "error", message: err.message ?? "Unknown error" }))
        controller.close()
      }
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
