"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Plus, FileText, MessageSquare, ExternalLink } from "lucide-react";
import { MagneticButton } from "@/components/MagneticButton";

const ease = [0.16, 1, 0.3, 1] as const;

interface HeroProps {
  isLoggedIn?: boolean;
}

export function Hero({ isLoggedIn = false }: HeroProps) {
  return (
    <main className="lp-font relative z-10 max-w-5xl mx-auto px-6 pt-28 md:pt-32 pb-20 text-center">

      {/* Eyebrow */}
      <div
        className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border"
        style={{ borderColor: 'var(--lp-primary-line)', background: 'var(--lp-primary-wash)' }}
      >
        <span className="inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--lp-primary-2)' }} />
        <span className="text-[11.5px] font-medium tracking-wide" style={{ color: 'var(--lp-primary-2)' }}>
          Now connects to Google Drive
        </span>
      </div>

      {/* Headline - rendered on first paint (LCP), no entrance animation */}
      <h1 className="lp-display text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-[-0.035em] leading-[1.0] mb-6">
        <span className="block" style={{ color: 'var(--lp-ink)' }}>Ask your Drive.</span>
        <span className="lp-gradient-text block">Get the answer.</span>
      </h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease }}
        className="text-[17px] md:text-[19px] leading-relaxed max-w-2xl mx-auto mb-9"
        style={{ color: 'var(--lp-mute-1)' }}
      >
        Connect Google Drive once. Cortex reads every document and answers your questions in plain language - with a link to the exact file and page each answer came from.
      </motion.p>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.4, ease }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        {isLoggedIn ? (
          <>
            <MagneticButton>
              <Link href="/dashboard"
                className="lp-btn-accent group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-[15px]"
              >
                Open dashboard
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link href="/dashboard"
                className="lp-btn-ghost group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-[15px]"
              >
                <Plus size={15} />
                New workspace
              </Link>
            </MagneticButton>
          </>
        ) : (
          <>
            <MagneticButton>
              <Link href="/login"
                className="lp-btn-accent group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-[15px]"
              >
                Connect Google Drive
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link href="#features"
                className="lp-btn-ghost inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-[15px]"
              >
                See how it works
              </Link>
            </MagneticButton>
          </>
        )}
      </motion.div>

      {/* Product UI mockup - single fade-in, static contents */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.24, ease }}
        className="mt-24 md:mt-28 mx-auto max-w-4xl"
      >
        <div className="lp-panel relative rounded-2xl overflow-hidden">
          {/* Gradient edge glow */}
          <div className="absolute -inset-px rounded-2xl opacity-40 pointer-events-none"
            style={{ background: 'var(--lp-grad)', maskImage: 'linear-gradient(black, transparent 40%)', WebkitMaskImage: 'linear-gradient(black, transparent 40%)', zIndex: -1 }} />

          {/* Window chrome */}
          <div className="flex items-center gap-3 px-4 py-3 border-b"
            style={{ background: 'rgba(28,25,23,0.015)', borderColor: 'var(--lp-border)' }}>
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(28,25,23,0.14)' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(28,25,23,0.14)' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(28,25,23,0.14)' }} />
            </div>
            <div className="flex-1 mx-2 px-3 py-1 rounded-md border text-[11px] font-mono text-left cx-num"
              style={{ background: 'rgba(28,25,23,0.025)', borderColor: 'var(--lp-border)', color: 'var(--lp-mute-2)' }}>
              app.cortex.ai/dashboard
            </div>
          </div>

          <div className="flex h-[340px] sm:h-[400px] text-left">
            {/* Sidebar */}
            <div className="w-[170px] sm:w-[210px] flex-shrink-0 border-r p-3 flex flex-col gap-1"
              style={{ background: 'rgba(28,25,23,0.012)', borderColor: 'var(--lp-border)' }}>
              <p className="text-[10.5px] font-semibold uppercase tracking-widest px-2 mb-1 cx-num"
                style={{ color: 'var(--lp-mute-2)' }}>Google Drive</p>

              {[
                { name: "Annual_Report_2024.pdf", active: true },
                { name: "Q3_Results.pdf",         active: false },
                { name: "Strategy_2025.pdf",      active: false },
                { name: "HR_Policy_v3.pdf",       active: false },
              ].map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default border"
                  style={{
                    background:  doc.active ? 'var(--lp-primary-wash)' : 'transparent',
                    borderColor: doc.active ? 'var(--lp-primary-line)'  : 'transparent',
                  }}
                >
                  <FileText size={12} className="flex-shrink-0"
                    style={{ color: doc.active ? 'var(--lp-primary-2)' : 'var(--lp-mute-2)' }} />
                  <span className="text-[11px] truncate font-medium"
                    style={{ color: doc.active ? 'var(--lp-primary-2)' : 'var(--lp-mute-1)' }}>
                    {doc.name}
                  </span>
                </div>
              ))}

              <div className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--lp-border)' }}>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default"
                  style={{ color: 'var(--lp-ok)' }}>
                  <span className="size-1.5 rounded-full" style={{ background: 'var(--lp-ok)' }} />
                  <span className="text-[11px] font-medium">Synced 4 min ago</span>
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b"
                style={{ background: 'rgba(28,25,23,0.008)', borderColor: 'var(--lp-border)' }}>
                <MessageSquare size={13} style={{ color: 'var(--lp-mute-2)' }} />
                <span className="text-[12px] font-semibold" style={{ color: 'var(--lp-ink-2)' }}>Ask your documents</span>
              </div>

              <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[65%] px-3.5 py-2 rounded-2xl rounded-tr-sm text-[12px] leading-relaxed"
                    style={{ background: 'var(--lp-grad)', color: '#fdfcfa', fontWeight: 500 }}>
                    What was our Q3 revenue and how does it compare to last year?
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="max-w-[78%] flex flex-col gap-2">
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-[12px] leading-relaxed border"
                      style={{ background: 'var(--lp-surface)', borderColor: 'var(--lp-border)', color: 'var(--lp-ink-2)' }}>
                      Based on{" "}
                      <span className="font-semibold" style={{ color: 'var(--lp-ink)' }}>Q3_Results.pdf</span>
                      , Q3 revenue reached{" "}
                      <span className="font-semibold" style={{ color: 'var(--lp-ink)' }}>$4.2M</span>
                      {" "}- up{" "}
                      <span className="font-semibold" style={{ color: 'var(--lp-ok)' }}>23% YoY</span>
                      {" "}from $3.4M in Q3 2023, driven by enterprise contract growth in APAC.
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["Q3_Results.pdf · p.12", "Annual_Report_2024.pdf · p.4"].map(cite => (
                        <div key={cite} className="lp-cite">
                          <ExternalLink size={9} />
                          {cite}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border"
                  style={{ background: 'var(--lp-surface)', borderColor: 'var(--lp-border)' }}>
                  <span className="flex-1 text-[12px]" style={{ color: 'var(--lp-mute-2)' }}>
                    Ask a question about your documents…
                  </span>
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--lp-grad)' }}>
                    <ArrowRight size={12} style={{ color: '#fdfcfa' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle reflection */}
        <div className="h-6 mx-8 rounded-b-2xl -mt-1 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(161,98,7,0.1), transparent)' }} />
      </motion.div>
    </main>
  );
}
