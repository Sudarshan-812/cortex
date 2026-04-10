# Cortex 🧠 
**Enterprise-Grade AI Document Intelligence Platform**

[![Live Demo](https://img.shields.io/badge/Live_Demo-cortex.sudarshank.com-000000?style=for-the-badge&logo=vercel)](https://cortex.sudarshank.com/)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini 2.5](https://img.shields.io/badge/Gemini_2.5-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)](https://aistudio.google.com/)

Cortex is a production-ready Retrieval-Augmented Generation (RAG) platform. It allows users to upload documents (PDF, DOCX, CSV) and query them conversationally. 

Unlike basic API wrappers, Cortex is built on a complex hybrid-search architecture utilizing PostgreSQL `pgvector`, BM25 full-text search, and Reciprocal Rank Fusion (RRF) to eliminate hallucinations and retrieve exact context.

## 🏗️ Core Architecture & Features

* **Advanced Hybrid Search:** Combines Vector Cosine Similarity (semantic meaning) with PostgreSQL BM25 (exact keyword matching) using RRF mathematics to ensure absolute retrieval accuracy.
* **Matryoshka Representation Learning:** Uses `gemini-embedding-001` to generate embeddings, slicing them to 768-dimensions to reduce database storage by 75% while maintaining premium search quality.
* **Agentic Reasoning Engine:** The system doesn't blindly generate text. It dynamically re-ranks the top 10 retrieved chunks using `gemini-2.5-flash` and executes a tool-use decision to determine if a live web search (via Tavily) is required to supplement the document context.
* **Zero-Latency Streaming (SSE):** AI responses and source citations are streamed token-by-token directly to the client using Server-Sent Events, matching the liquid-smooth performance of ChatGPT/Claude.
* **Conversational Memory:** Deep native history integration allows for complex follow-up questions scoped securely to isolated user workspaces via Supabase Row Level Security (RLS).
* **Premium Liquid UI:** Built with Tailwind CSS v4 and Framer Motion, featuring optimistic updates, scroll-aware frosted glass navbars, dynamic time-of-day greetings, and accessible screen-reader support.

## ⚙️ The Technical Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router) | Server Components, API Routes, SSE Streaming |
| **Database** | Supabase (PostgreSQL) | Auth, Storage, and relational data |
| **Vector Engine** | `pgvector` + FTS | IVFFlat indexed embeddings & GIN indexed Text Search |
| **AI Models** | Google Gemini | `gemini-embedding-001` & `gemini-2.5-flash` |
| **Styling** | Tailwind v4 + Framer Motion | High-FPS liquid animations and responsive design |

## 🧠 The AI Pipeline (Under the Hood)

For every message sent, Cortex executes a strict, multi-step orchestration:

1. **Mandatory Retrieval:** User query is embedded (768-dim). The Supabase RPC `match_documents` runs the Hybrid Search (Vector + BM25 -> RRF).
2. **Re-Ranking:** Gemini 2.5 scores the top 10 retrieved chunks 1–10 for relevance to the specific question. The top 3 are selected.
3. **Agentic Decision:** Gemini evaluates the context and decides if external Web Search is required to supplement the data.
4. **SSE Stream:** The final answer is streamed back to the client, attaching the exact document metadata (JSONB) as clickable source citations.

## 🛡️ Security & Database Schema

This project relies on strict Row Level Security (RLS) in Supabase. A user can only read, embed, and query chunks belonging to their authenticated `workspace_id`. The schema includes triggers for auto-updating `tsvector` columns for Full Text Search (FTS) upon chunk insertion.

## ⚖️ Copyright & License

**© 2026 Sudarshan Kulkarni. All Rights Reserved.**

This repository is uniquely developed as a proprietary portfolio piece. The source code is made public strictly for **demonstration, evaluation, and code-review purposes by prospective employers.**

* 🚫 **No Unauthorized Cloning:** You may not clone, deploy, or run this software locally or on a server.
* 🚫 **No Commercial Use:** You may not use, modify, or distribute this codebase for any commercial or non-commercial projects.
* 🚫 **No Derivatives:** You may not fork this repository to create derivative works.

If you are a recruiter, engineering manager, or founder reviewing my profile, you are welcome to inspect the architecture and code quality directly on GitHub.

---
*Built by [Sudarshan Kulkarni](https://sudarshank.com)*