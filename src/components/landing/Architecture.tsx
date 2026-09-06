"use client";

import { motion } from "framer-motion";
import { Upload, Sparkles, Search, ArrowUpDown, Bot, Radio, ArrowRight, ArrowDown } from "lucide-react";
import { Spotlight } from "./Spotlight";

const ease = [0.16, 1, 0.3, 1] as const;

const nodes = [
  {
    icon: Upload,
    step: "STEP 01",
    title: "Sync & Chunk",
    desc: "Files from your connected Google Drive folder (and any direct uploads) are parsed and split into overlapping chunks.",
    tag: "document_chunks",
  },
  {
    icon: Sparkles,
    step: "STEP 02",
    title: "Matryoshka Embeddings",
    desc: "Each chunk is embedded with gemini-embedding-001 and truncated to 768 dimensions, then stored in Supabase pgvector.",
    tag: "768-dim",
  },
  {
    icon: Search,
    step: "STEP 03",
    title: "Hybrid Retrieval",
    desc: "pgvector cosine similarity and Postgres full-text search run in parallel, fused with Reciprocal Rank Fusion.",
    tag: "RRF · k=60",
  },
  {
    icon: ArrowUpDown,
    step: "STEP 04",
    title: "AI Re-ranking",
    desc: "The top 10 candidate chunks are scored for relevance and cut down to the 3 that actually answer the question.",
    tag: "gemini-3.1-flash-lite",
  },
  {
    icon: Bot,
    step: "STEP 05",
    title: "Agentic Decision",
    desc: "The agent checks whether the retrieved context is sufficient, or reaches out to live web search when it isn't.",
    tag: "tool-calling · Tavily",
  },
  {
    icon: Radio,
    step: "STEP 06",
    title: "Streamed Response",
    desc: "The final answer streams back token-by-token over Server-Sent Events, cited to the exact source chunk.",
    tag: "SSE · gemini-2.5-flash",
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="lp-font relative z-10 max-w-7xl mx-auto px-6 pb-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.4, ease }}
        className="lp-panel relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-10 sm:py-14"
      >
        {/* Faint top glow */}
        <div
          className="absolute inset-x-0 top-0 h-64 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(161,98,7,0.08), transparent)" }}
        />

        {/* Header */}
        <div className="relative z-10 text-center mb-12">
          <p className="lp-rule-label mb-3" style={{ color: "var(--lp-primary)" }}>
            Architecture
          </p>
          <h2
            className="lp-display text-4xl md:text-5xl font-medium tracking-tight mb-3"
            style={{ color: "var(--lp-ink)" }}
          >
            From your question to a <span className="lp-gradient-text">cited answer</span>
          </h2>
          <p className="text-[15px] max-w-xl mx-auto leading-relaxed" style={{ color: "var(--lp-mute-1)" }}>
            The actual pipeline behind every answer: retrieval, re-ranking, a grounding check, then a response cited to the source.
          </p>
        </div>

        {/* Pipeline grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const Icon = node.icon;
            const i = nodes.indexOf(node);
            const isLastInRow = (i + 1) % 3 === 0;
            const isLast = i === nodes.length - 1;

            return (
              <div
                key={node.title}
                className="lp-node relative rounded-2xl border"
              >
                <Spotlight className="rounded-2xl p-5 flex flex-col gap-3 h-full">
                  <span
                    className="text-[10.5px] font-semibold tracking-widest"
                    style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--lp-mute-2)" }}
                  >
                    {node.step}
                  </span>

                  <div
                    className="size-9 rounded-xl flex items-center justify-center border"
                    style={{ background: "var(--lp-surface-2)", borderColor: "var(--lp-border)" }}
                  >
                    <Icon size={16} style={{ color: "var(--lp-mute-2)" }} />
                  </div>

                  <h3 className="text-[13.5px] font-semibold" style={{ color: "var(--lp-ink)" }}>
                    {node.title}
                  </h3>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--lp-mute-1)" }}>
                    {node.desc}
                  </p>

                  <span
                    className="inline-flex w-fit items-center px-2 py-1 rounded-md border text-[10.5px]"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      background: "var(--lp-surface-2)",
                      borderColor: "var(--lp-border)",
                      color: "var(--lp-mute-1)",
                    }}
                  >
                    {node.tag}
                  </span>
                </Spotlight>

                {/* Connector to next node in the same row */}
                {!isLast && !isLastInRow && (
                  <div
                    className="hidden lg:flex absolute top-1/2 -right-[22px] -translate-y-1/2 items-center justify-center size-6 rounded-full border z-10"
                    style={{ background: "var(--lp-surface)", borderColor: "var(--lp-border)" }}
                  >
                    <ArrowRight size={12} style={{ color: "var(--lp-mute-2)" }} />
                  </div>
                )}

                {/* Connector down to next row (step 3 -> step 4) */}
                {isLastInRow && !isLast && (
                  <div
                    className="hidden lg:flex absolute -bottom-[22px] left-1/2 -translate-x-1/2 items-center justify-center size-6 rounded-full border z-10"
                    style={{ background: "var(--lp-surface)", borderColor: "var(--lp-border)" }}
                  >
                    <ArrowDown size={12} style={{ color: "var(--lp-mute-2)" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
