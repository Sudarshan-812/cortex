"use client";

import { motion } from "framer-motion";
import { Database, FileSearch, BrainCircuit, Zap, ArrowUpRight } from "lucide-react";

export function Features() {
  return (
    <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 pb-32 pt-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="md:col-span-2 relative block overflow-hidden rounded-[2rem] p-8 md:p-10 bg-white/40 backdrop-blur-2xl border border-zinc-200/60 z-0 group transition-[transform,box-shadow] duration-300 hover:shadow-xl hover:shadow-zinc-900/5 hover:-translate-y-1">
          <div className="absolute z-[-1] -top-8 -right-8 h-16 w-16 rounded-full bg-zinc-950 transform scale-100 origin-center transition-transform duration-[1200ms] ease-in-out group-hover:scale-[80]" />
          <div className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center bg-zinc-950 rounded-bl-[2rem] overflow-hidden z-10 border-b border-l border-zinc-800">
            <ArrowUpRight className="size-5 text-white mr-[-2px] mt-[-2px]" />
          </div>
          <div className="relative z-10">
            <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-8 border border-zinc-200/80 group-hover:bg-zinc-800 group-hover:border-zinc-700 transition-colors duration-[800ms]">
              <Database className="size-7 text-zinc-950 group-hover:text-white transition-colors duration-[800ms]" />
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-zinc-950 mb-4 group-hover:text-white transition-colors duration-[800ms]">
              Enterprise RAG Pipeline
            </h3>
            <p className="text-zinc-700 leading-relaxed max-w-lg font-medium group-hover:text-zinc-300 transition-colors duration-[800ms] text-lg">
              Documents are chunked and embedded using Matryoshka Representation Learning (768-dim) and stored securely in pgvector via Supabase.
            </p>
          </div>
        </div>

        <div className="relative block overflow-hidden rounded-[2rem] p-8 md:p-10 bg-white/40 backdrop-blur-2xl border border-zinc-200/60 z-0 group transition-[transform,box-shadow] duration-300 hover:shadow-xl hover:shadow-zinc-900/5 hover:-translate-y-1">
          <div className="absolute z-[-1] -top-8 -right-8 h-16 w-16 rounded-full bg-zinc-950 transform scale-100 origin-center transition-transform duration-[1200ms] ease-in-out group-hover:scale-[50]" />
          <div className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center bg-zinc-950 rounded-bl-[2rem] overflow-hidden z-10 border-b border-l border-zinc-800">
            <ArrowUpRight className="size-5 text-white mr-[-2px] mt-[-2px]" />
          </div>
          <div className="relative z-10">
            <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-8 border border-zinc-200/80 group-hover:bg-zinc-800 group-hover:border-zinc-700 transition-colors duration-[800ms]">
              <FileSearch className="size-7 text-zinc-950 group-hover:text-white transition-colors duration-[800ms]" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-950 mb-4 group-hover:text-white transition-colors duration-[800ms]">
              Hybrid Search
            </h3>
            <p className="text-zinc-700 leading-relaxed font-medium group-hover:text-zinc-300 transition-colors duration-[800ms] text-lg">
              Merging Vector Cosine similarity with BM25 keyword search using advanced PostgreSQL RPCs.
            </p>
          </div>
        </div>

        <div className="relative block overflow-hidden rounded-[2rem] p-8 md:p-10 bg-white/40 backdrop-blur-2xl border border-zinc-200/60 z-0 group transition-[transform,box-shadow] duration-300 hover:shadow-xl hover:shadow-zinc-900/5 hover:-translate-y-1">
          <div className="absolute z-[-1] -top-8 -right-8 h-16 w-16 rounded-full bg-zinc-950 transform scale-100 origin-center transition-transform duration-[1200ms] ease-in-out group-hover:scale-[50]" />
          <div className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center bg-zinc-950 rounded-bl-[2rem] overflow-hidden z-10 border-b border-l border-zinc-800">
            <ArrowUpRight className="size-5 text-white mr-[-2px] mt-[-2px]" />
          </div>
          <div className="relative z-10">
            <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-8 border border-zinc-200/80 group-hover:bg-zinc-800 group-hover:border-zinc-700 transition-colors duration-[800ms]">
              <BrainCircuit className="size-7 text-zinc-950 group-hover:text-white transition-colors duration-[800ms]" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-950 mb-4 group-hover:text-white transition-colors duration-[800ms]">
              Gemini Re-ranking
            </h3>
            <p className="text-zinc-700 leading-relaxed font-medium group-hover:text-zinc-300 transition-colors duration-[800ms] text-lg">
              Top 10 chunks are dynamically re-ranked by Gemini before being fed into the agentic reasoning engine.
            </p>
          </div>
        </div>

        <div className="md:col-span-2 relative block overflow-hidden rounded-[2rem] p-8 md:p-10 bg-white/40 backdrop-blur-2xl border border-zinc-200/60 z-0 group transition-[transform,box-shadow] duration-300 hover:shadow-xl hover:shadow-zinc-900/5 hover:-translate-y-1">
          <div className="absolute z-[-1] -top-8 -right-8 h-16 w-16 rounded-full bg-zinc-950 transform scale-100 origin-center transition-transform duration-[1200ms] ease-in-out group-hover:scale-[80]" />
          <div className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center bg-zinc-950 rounded-bl-[2rem] overflow-hidden z-10 border-b border-l border-zinc-800">
            <ArrowUpRight className="size-5 text-white mr-[-2px] mt-[-2px]" />
          </div>
          <div className="relative z-10">
            <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-8 border border-zinc-200/80 group-hover:bg-zinc-800 group-hover:border-zinc-700 transition-colors duration-[800ms]">
              <Zap className="size-7 text-zinc-950 group-hover:text-white transition-colors duration-[800ms]" />
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-zinc-950 mb-4 group-hover:text-white transition-colors duration-[800ms]">
              Zero-Latency SSE
            </h3>
            <p className="text-zinc-700 leading-relaxed max-w-lg font-medium group-hover:text-zinc-300 transition-colors duration-[800ms] text-lg">
              Agentic web-search decisions and final answers are streamed back instantly using Server-Sent Events, ensuring a liquid-smooth user experience.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
