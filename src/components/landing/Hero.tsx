"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Plus, FileText, MessageSquare, ExternalLink } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

interface HeroProps {
  isLoggedIn?: boolean;
}

export function Hero({ isLoggedIn = false }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-22%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <main ref={heroRef} className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-20 text-center" style={{ position: 'relative' }}>

      {/* Parallax wrapper — text drifts up slower than scroll */}
      <motion.div style={{ y: textY, opacity: textOpacity }}>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-8"
        style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)' }}
      >
        <span className="size-1.5 rounded-full cx-pulse-dot flex-shrink-0" style={{ background: 'var(--cx-ok)' }} />
        <span className="text-[11px] font-semibold tracking-[.1em] uppercase cx-num" style={{ color: 'var(--cx-ink-2)' }}>
          Production RAG — Live
        </span>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.55, ease }}
      >
        <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-semibold tracking-[-0.03em] leading-[1.05] mb-6"
          style={{ textShadow: '0 1px 24px rgba(246,245,242,0.6)' }}>
          <span style={{ color: 'var(--cx-ink)' }}>Your documents.</span>
          <br />
          <span style={{ color: 'var(--cx-ink-2)' }}>Finally intelligent.</span>
        </h1>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.5, ease }}
        className="text-[17px] md:text-[19px] leading-relaxed max-w-2xl mx-auto mb-10"
        style={{ color: 'var(--cx-ink-2)' }}
      >
        Cortex turns your PDFs, documents, and notes into a smart, conversational knowledge base using hybrid search, AI re-ranking, and source citations.
      </motion.p>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45, ease }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        {isLoggedIn ? (
          <>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link href="/dashboard"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-[15px] transition-all cx-btn-ink">
                Open Dashboard
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link href="/dashboard"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-[15px] border transition-all cx-panel"
                style={{ color: 'var(--cx-ink-2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <Plus size={16} style={{ color: 'var(--cx-mute-2)' }} />
                Create Workspace
              </Link>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link href="/login"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-[15px] transition-all cx-btn-ink">
                Start Analyzing Documents
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link href="#features"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full font-semibold text-[15px] border transition-all cx-panel"
                style={{ color: 'var(--cx-ink-2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                Learn How It Works
              </Link>
            </motion.div>
          </>
        )}
      </motion.div>

      </motion.div>{/* end parallax wrapper */}

      {/* Product UI mockup — outside parallax, sits deeper */}
      <motion.div
        initial={{ opacity: 0, y: 64 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="mt-40 mx-auto max-w-4xl"
      >
        <div className="rounded-2xl border overflow-hidden"
          style={{
            borderColor: 'var(--cx-line)',
            background: 'var(--cx-paper)',
            boxShadow: '0 32px 80px -8px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.04)',
          }}>

          {/* Window chrome */}
          <div className="flex items-center gap-3 px-4 py-3 border-b"
            style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)' }}>
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(0,0,0,0.12)' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(0,0,0,0.12)' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(0,0,0,0.12)' }} />
            </div>
            <div className="flex-1 mx-2 px-3 py-1 rounded-md border text-[11px] font-mono text-left cx-num"
              style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)', color: 'var(--cx-mute-2)' }}>
              app.cortex.ai/dashboard
            </div>
          </div>

          <div className="flex h-[340px] sm:h-[400px] text-left">
            {/* Sidebar */}
            <div className="w-[170px] sm:w-[210px] flex-shrink-0 border-r p-3 flex flex-col gap-1"
              style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)' }}>
              <p className="text-[9.5px] font-semibold uppercase tracking-widest px-2 mb-1 cx-num"
                style={{ color: 'var(--cx-mute-2)' }}>Workspace</p>
              {[
                { name: "Annual_Report_2024.pdf", active: true },
                { name: "Q3_Results.pdf",         active: false },
                { name: "Strategy_2025.pdf",      active: false },
                { name: "HR_Policy_v3.pdf",       active: false },
              ].map(doc => (
                <div key={doc.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default border transition-colors"
                  style={{
                    background:   doc.active ? 'var(--cx-accent-wash)' : 'transparent',
                    borderColor:  doc.active ? 'var(--cx-accent-line)'  : 'transparent',
                  }}>
                  <FileText size={12} className="flex-shrink-0"
                    style={{ color: doc.active ? 'var(--cx-accent)' : 'var(--cx-mute-2)' }} />
                  <span className="text-[11px] truncate font-medium"
                    style={{ color: doc.active ? 'var(--cx-accent)' : 'var(--cx-mute-1)' }}>
                    {doc.name}
                  </span>
                </div>
              ))}
              <div className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--cx-line)' }}>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default"
                  style={{ color: 'var(--cx-mute-2)' }}>
                  <Plus size={12} />
                  <span className="text-[11px] font-medium">Upload document</span>
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b"
                style={{ background: 'var(--cx-paper)', borderColor: 'var(--cx-line)' }}>
                <MessageSquare size={13} style={{ color: 'var(--cx-mute-2)' }} />
                <span className="text-[12px] font-semibold" style={{ color: 'var(--cx-ink-2)' }}>Ask your documents</span>
              </div>

              <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3"
                style={{ background: 'var(--cx-paper)' }}>
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[65%] px-3.5 py-2 rounded-2xl rounded-tr-sm text-[12px] leading-relaxed text-white"
                    style={{ background: 'var(--cx-ink)' }}>
                    What was our Q3 revenue and how does it compare to last year?
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="max-w-[78%] flex flex-col gap-2">
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-[12px] leading-relaxed border"
                      style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)', color: 'var(--cx-ink-2)' }}>
                      Based on{" "}
                      <span className="font-semibold" style={{ color: 'var(--cx-ink)' }}>Q3_Results.pdf</span>
                      , Q3 revenue reached{" "}
                      <span className="font-semibold" style={{ color: 'var(--cx-ink)' }}>$4.2M</span>
                      {" "}— up{" "}
                      <span className="font-semibold" style={{ color: 'var(--cx-ok)' }}>23% YoY</span>
                      {" "}from $3.4M in Q3 2023, driven by enterprise contract growth in APAC.
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["Q3_Results.pdf · p.12", "Annual_Report_2024.pdf · p.4"].map(cite => (
                        <div key={cite}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium cx-num"
                          style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)', color: 'var(--cx-accent)' }}>
                          <ExternalLink size={9} />
                          {cite}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="px-4 pb-4" style={{ background: 'var(--cx-paper)' }}>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border"
                  style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)' }}>
                  <span className="flex-1 text-[12px]" style={{ color: 'var(--cx-mute-2)' }}>
                    Ask a question about your documents…
                  </span>
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--cx-ink)' }}>
                    <ArrowRight size={12} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle reflection */}
        <div className="h-6 mx-8 rounded-b-2xl -mt-1 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.04), transparent)' }} />
      </motion.div>
    </main>
  );
}
