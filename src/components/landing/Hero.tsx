"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Plus, FileText, MessageSquare, ExternalLink } from "lucide-react";
import SplitText from "@/components/SplitText";
import ScrollReveal from "@/components/ScrollReveal";

interface HeroProps {
  isLoggedIn?: boolean;
}

export function Hero({ isLoggedIn = false }: HeroProps) {
  return (
    <main className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-zinc-200/80 mb-8 shadow-sm">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold tracking-widest text-zinc-800 uppercase">Production RAG Live</span>
        </div>

        <SplitText
          text="Your documents. Finally intelligent."
          className="text-6xl md:text-8xl lg:text-[6.5rem] font-bold tracking-[-0.03em] leading-[1.02] text-zinc-950 mb-8"
          delay={40}
          duration={1.1}
          tag="h1"
        />

        <div className="mb-10 max-w-3xl mx-auto">
          <ScrollReveal
            baseOpacity={0.1}
            enableBlur={true}
            baseRotation={2}
            blurStrength={4}
            textClassName="text-lg md:text-xl lg:text-2xl text-zinc-600 leading-relaxed font-medium text-center"
          >
            Cortex turns your PDFs, documents, and notes into a smart, conversational knowledge base using hybrid search, AI re-ranking, and source citations.
          </ScrollReveal>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4 justify-center mt-6"
      >
        {isLoggedIn ? (
          <>
            <Link
              href="/dashboard"
              className="group relative overflow-hidden flex items-center justify-center gap-2 bg-zinc-950 hover:bg-black text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
            >
              <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-15deg]" />
              Open Dashboard
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/50 backdrop-blur-xl border border-zinc-200/80 text-zinc-950 rounded-full font-bold text-lg hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Plus className="size-5 text-zinc-600" />
              Create Workspace
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="group relative overflow-hidden flex items-center justify-center gap-2 bg-zinc-950 hover:bg-black text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
            >
              <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-15deg]" />
              Start Analyzing Documents
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-white/50 backdrop-blur-xl border border-zinc-200/80 text-zinc-950 rounded-full font-bold text-lg hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              Learn How It Works
            </Link>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="mt-16 mx-auto max-w-4xl"
      >
        <div className="rounded-2xl border border-zinc-200/70 bg-white/50 backdrop-blur-xl shadow-[0_32px_80px_-8px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/90 border-b border-zinc-200/60">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400/80" />
              <div className="h-3 w-3 rounded-full bg-amber-400/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex-1 mx-2 px-3 py-1 bg-white/80 rounded-md border border-zinc-200/60 text-[11px] text-zinc-400 font-mono text-left">
              app.cortex.ai/dashboard
            </div>
          </div>

          <div className="flex h-[340px] sm:h-[400px] text-left">
            <div className="w-[180px] sm:w-[220px] flex-shrink-0 border-r border-zinc-100 bg-zinc-50/60 p-3 flex flex-col gap-1">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-1">Workspace</p>
              {[
                { name: "Annual_Report_2024.pdf", active: true },
                { name: "Q3_Results.pdf", active: false },
                { name: "Strategy_2025.pdf", active: false },
                { name: "HR_Policy_v3.pdf", active: false },
              ].map((doc) => (
                <div
                  key={doc.name}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default ${
                    doc.active ? "bg-white border border-zinc-200/80 shadow-sm" : "hover:bg-white/60"
                  }`}
                >
                  <FileText className={`size-3.5 flex-shrink-0 ${doc.active ? "text-zinc-700" : "text-zinc-400"}`} />
                  <span className={`text-[11px] truncate font-medium ${doc.active ? "text-zinc-800" : "text-zinc-500"}`}>
                    {doc.name}
                  </span>
                </div>
              ))}
              <div className="mt-auto pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-500 cursor-default">
                  <Plus className="size-3.5" />
                  <span className="text-[11px] font-medium">Upload document</span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100 bg-white/40">
                <MessageSquare className="size-3.5 text-zinc-400" />
                <span className="text-[12px] font-semibold text-zinc-700">Ask your documents</span>
              </div>

              <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3">
                <div className="flex justify-end">
                  <div className="max-w-[65%] bg-zinc-950 text-white px-3.5 py-2 rounded-2xl rounded-tr-sm text-[12px] leading-relaxed">
                    What was our Q3 revenue and how does it compare to last year?
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-[78%] flex flex-col gap-2">
                    <div className="bg-white border border-zinc-200/70 shadow-sm px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-[12px] leading-relaxed text-zinc-700">
                      Based on <span className="font-semibold text-zinc-900">Q3_Results.pdf</span>, Q3 revenue reached{" "}
                      <span className="font-semibold text-zinc-900">$4.2M</span> — up{" "}
                      <span className="text-emerald-600 font-semibold">23% YoY</span> from $3.4M in Q3 2023, driven primarily by enterprise contract growth in APAC.
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["Q3_Results.pdf · p.12", "Annual_Report_2024.pdf · p.4"].map((cite) => (
                        <div key={cite} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 border border-zinc-200/60 rounded-full text-[10px] font-medium text-zinc-500">
                          <ExternalLink className="size-2.5" />
                          {cite}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-zinc-200/80 rounded-xl shadow-sm">
                  <span className="flex-1 text-[12px] text-zinc-500">Ask a question about your documents…</span>
                  <div className="h-6 w-6 rounded-lg bg-zinc-950 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="size-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-8 mx-6 rounded-b-2xl bg-gradient-to-b from-zinc-200/30 to-transparent blur-sm -mt-1" />
      </motion.div>
    </main>
  );
}
