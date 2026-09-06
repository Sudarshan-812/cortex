"use client";

import { motion } from "framer-motion";
import { Search, Database, ArrowUpDown, Radio, Bot, Quote, ArrowRight } from "lucide-react";
import { Spotlight } from "./Spotlight";

const ease = [0.16, 1, 0.3, 1] as const;

function TileHeader({ icon: Icon, label }: { icon: typeof Search; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div
        className="size-8 rounded-lg flex items-center justify-center border flex-shrink-0"
        style={{ background: "var(--lp-primary-wash)", borderColor: "var(--lp-primary-line)" }}
      >
        <Icon size={14} style={{ color: "var(--lp-primary)" }} />
      </div>
      <span
        className="text-[10.5px] font-semibold uppercase tracking-widest"
        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--lp-mute-2)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Tile({
  className,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.25, ease }}
      className={`lp-panel relative overflow-hidden rounded-[1.75rem] group h-full ${className ?? ""}`}
    >
      <Spotlight className="relative rounded-[1.75rem] p-7 h-full block">
        {children}
      </Spotlight>
      <div
        className="absolute bottom-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(90deg, transparent, var(--lp-primary-line), transparent)" }}
      />
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="lp-font relative z-10 max-w-7xl mx-auto px-6 pb-28 pt-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.35, ease }}
        className="text-center mb-12"
      >
        <p className="lp-rule-label mb-3">Why it&apos;s different</p>
        <h2 className="lp-display text-4xl md:text-5xl font-medium tracking-tight mb-3" style={{ color: "var(--lp-ink)" }}>
          Answers you can actually <span className="lp-gradient-text">trust</span>
        </h2>
        <p className="text-[15px] max-w-xl mx-auto" style={{ color: "var(--lp-mute-1)" }}>
          Every answer is grounded in your own files, checked for relevance before it&apos;s written, and cited so you can verify it in one click.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-[minmax(170px,auto)] gap-4">
        {/* Hybrid Search - large */}
        <Tile className="md:col-span-2 md:row-span-2" delay={0}>
          <TileHeader icon={Search} label="Retrieval" />
          <h3 className="text-2xl md:text-[1.6rem] font-bold tracking-tight mb-3" style={{ color: "var(--lp-ink)" }}>
            Finds what you mean, not just what you type
          </h3>
          <p className="text-[14.5px] leading-relaxed max-w-md mb-6" style={{ color: "var(--lp-mute-1)" }}>
            Cortex matches on meaning and on exact wording at the same time, then merges both - so it surfaces the right passage whether or not you used the words in the document.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="lp-mono text-[11px] px-2.5 py-1.5 rounded-lg border" style={{ background: "var(--lp-surface-2)", borderColor: "var(--lp-border)", color: "var(--lp-ink-2)" }}>
              vector cosine
            </span>
            <span className="text-[13px]" style={{ color: "var(--lp-mute-2)" }}>+</span>
            <span className="lp-mono text-[11px] px-2.5 py-1.5 rounded-lg border" style={{ background: "var(--lp-surface-2)", borderColor: "var(--lp-border)", color: "var(--lp-ink-2)" }}>
              BM25 full-text
            </span>
            <ArrowRight size={13} style={{ color: "var(--lp-mute-2)" }} />
            <span className="lp-tag">RRF · k=60</span>
          </div>
        </Tile>

        {/* Isolation */}
        <Tile delay={0.07}>
          <TileHeader icon={Database} label="Privacy" />
          <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--lp-ink)" }}>
            Your files stay yours
          </h3>
          <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--lp-mute-1)" }}>
            Read-only access to the folder you choose. Everything is scoped to your workspace with row-level isolation, so documents never cross between accounts.
          </p>
        </Tile>

        {/* Re-ranking */}
        <Tile delay={0.14}>
          <TileHeader icon={ArrowUpDown} label="Re-ranking" />
          <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--lp-ink)" }}>
            Reads the whole doc, quotes the part that matters
          </h3>
          <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--lp-mute-1)" }}>
            Candidate passages are scored for relevance and narrowed to the few that actually answer your question before anything is written.
          </p>
        </Tile>

        {/* SSE Streaming - wide */}
        <Tile className="md:col-span-2" delay={0.21}>
          <TileHeader icon={Radio} label="Streaming" />
          <h3 className="text-xl font-bold tracking-tight mb-3" style={{ color: "var(--lp-ink)" }}>
            Answers stream as they&apos;re written
          </h3>
          <div
            className="text-[13.5px] leading-relaxed p-3 rounded-xl border"
            style={{ background: "var(--lp-surface-2)", borderColor: "var(--lp-border)", color: "var(--lp-ink-2)" }}
          >
            Q3 revenue reached $4.2M - up 23% YoY from enterprise contract growth in APAC.
          </div>
        </Tile>

        {/* Grounding honesty */}
        <Tile delay={0.28}>
          <TileHeader icon={Bot} label="Grounding" />
          <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--lp-ink)" }}>
            Tells you when your files don&apos;t have the answer
          </h3>
          <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--lp-mute-1)" }}>
            If the documents don&apos;t cover your question, Cortex says so instead of guessing - and can reach out to live web search when you want it to.
          </p>
        </Tile>

        {/* Citations - closing strip */}
        <Tile className="md:col-span-3" delay={0.35}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="size-8 rounded-lg flex items-center justify-center border" style={{ background: "var(--lp-primary-wash)", borderColor: "var(--lp-primary-line)" }}>
                <Quote size={14} style={{ color: "var(--lp-primary)" }} />
              </div>
              <h3 className="text-xl font-bold tracking-tight" style={{ color: "var(--lp-ink)" }}>
                Cited, always
              </h3>
            </div>
            <p className="text-[13.5px] leading-relaxed flex-1" style={{ color: "var(--lp-mute-1)" }}>
              Every claim traces back to the exact file and page it came from - click a citation to open the source.
            </p>
            <div className="flex gap-1.5 flex-shrink-0">
              {["Q3_Results.pdf · p.12", "Annual_Report_2024.pdf · p.4"].map((cite) => (
                <span key={cite} className="lp-cite !px-2.5 !py-1 text-[10.5px]">
                  {cite}
                </span>
              ))}
            </div>
          </div>
        </Tile>
      </div>
    </section>
  );
}
