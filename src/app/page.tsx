"use client";

import React from 'react';
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, BrainCircuit, Database, FileSearch, Zap, ArrowUpRight } from "lucide-react";

import SplitText from "@/components/SplitText";
import ScrollReveal from "@/components/ScrollReveal";
import SoftAurora from "@/components/SoftAurora";

export default function LandingPage() {
  const handleAnimationComplete = () => {
    console.log("Headline GSAP animation complete!");
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 overflow-hidden font-sans relative selection:bg-fuchsia-200">
      
      {/* Soft Aurora Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SoftAurora
          speed={0.5}
          scale={1.4}
          brightness={0.9}
          color1="#f0f0f0"
          color2="#c026d3" // Sharp Fuchsia
          noiseFrequency={2.2}
          noiseAmplitude={0.8}
          bandHeight={0.6}
          bandSpread={1.1}
          octaveDecay={0.15}
          layerOffset={0.2}
          colorSpeed={0.8}
          enableMouseInteraction
          mouseInfluence={0.2}
        />
      </div>

      {/* Ultra-Premium Twine Navbar with Custom Logo */}
      <header className="absolute top-0 inset-x-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-24 flex items-center justify-between">
          
          {/* Left: Custom PNG Logo & Adjusted Text (Dialed back to font-semibold) */}
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <img 
              src="/CortexLogo.png" 
              alt="Cortex Logo" 
              className="h-8 md:h-14 w-auto object-contain" 
            />
            <span className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-950">
              Cortex
            </span>
          </div>

          {/* Center: Links (Sleek, 14px, medium weight) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#" className="text-[14px] font-medium text-zinc-500 hover:text-zinc-950 transition-colors">Product</Link>
            <Link href="#" className="text-[14px] font-medium text-zinc-500 hover:text-zinc-950 transition-colors">Features</Link>
            <Link href="#" className="text-[14px] font-medium text-zinc-500 hover:text-zinc-950 transition-colors">Use Cases</Link>
            <Link href="#" className="text-[14px] font-medium text-zinc-500 hover:text-zinc-950 transition-colors">Docs</Link>
          </nav>

          {/* Right: Auth */}
          <div className="flex items-center justify-end gap-5 flex-1">
            <Link href="/login" className="text-[14px] font-medium text-zinc-500 hover:text-zinc-950 transition-colors">
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="h-9 px-5 inline-flex items-center justify-center bg-zinc-950 text-white rounded-full text-[14px] font-medium hover:bg-zinc-800 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-zinc-200/80 mb-8 shadow-sm">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-zinc-800 uppercase">Production RAG Live</span>
          </div>

          {/* Refined Headline */}
          <SplitText
            text="Your documents. Finally intelligent."
            className="text-6xl md:text-8xl lg:text-[6.5rem] font-bold tracking-[-0.03em] leading-[1.02] text-zinc-950 mb-8"
            delay={40}
            duration={1.1}
            tag="h1"
            onLetterAnimationComplete={handleAnimationComplete}
          />

          {/* Refined Sub-headline */}
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

        {/* Premium CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-6"
        >
          <Link
            href="/dashboard"
            className="group flex items-center justify-center gap-2 bg-zinc-950 hover:bg-black text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
          >
            Start Analyzing Documents
            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#features"
            className="px-8 py-4 bg-white/50 backdrop-blur-xl border border-zinc-200/80 text-zinc-950 rounded-full font-bold text-lg hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            Learn How It Works
          </Link>
        </motion.div>
      </main>

      {/* Refined Uiverse Expanding Feature Cards */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 pb-32 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Card 1 (Wide) */}
          <div className="md:col-span-2 relative block overflow-hidden rounded-[2rem] p-8 md:p-10 bg-white/40 backdrop-blur-2xl border border-zinc-200/60 z-0 group transition-all duration-300 hover:shadow-xl hover:shadow-zinc-900/5">
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

          {/* Card 2 (Square) */}
          <div className="relative block overflow-hidden rounded-[2rem] p-8 md:p-10 bg-white/40 backdrop-blur-2xl border border-zinc-200/60 z-0 group transition-all duration-300 hover:shadow-xl hover:shadow-zinc-900/5">
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

          {/* Card 3 (Square) */}
          <div className="relative block overflow-hidden rounded-[2rem] p-8 md:p-10 bg-white/40 backdrop-blur-2xl border border-zinc-200/60 z-0 group transition-all duration-300 hover:shadow-xl hover:shadow-zinc-900/5">
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

          {/* Card 4 (Wide) */}
          <div className="md:col-span-2 relative block overflow-hidden rounded-[2rem] p-8 md:p-10 bg-white/40 backdrop-blur-2xl border border-zinc-200/60 z-0 group transition-all duration-300 hover:shadow-xl hover:shadow-zinc-900/5">
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
    </div>
  );
}