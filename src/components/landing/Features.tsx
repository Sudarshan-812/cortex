"use client";

import { motion } from "framer-motion";
import { Database, FileSearch, BrainCircuit, Zap, ArrowUpRight } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const cards = [
  {
    icon: Database,
    title: "Enterprise RAG Pipeline",
    description: "Documents are chunked and embedded using Matryoshka Representation Learning (768-dim) and stored securely in pgvector via Supabase.",
    wide: true,
  },
  {
    icon: FileSearch,
    title: "Hybrid Search",
    description: "Merging vector cosine similarity with BM25 keyword search via Reciprocal Rank Fusion for best-in-class retrieval.",
    wide: false,
  },
  {
    icon: BrainCircuit,
    title: "Gemini Re-ranking",
    description: "Top 10 chunks are dynamically re-ranked by Gemini before being fed into the agentic reasoning engine.",
    wide: false,
  },
  {
    icon: Zap,
    title: "Zero-Latency SSE",
    description: "Agentic decisions and final answers are streamed back instantly using Server-Sent Events, ensuring a liquid-smooth user experience.",
    wide: true,
  },
];

export function Features() {
  return (
    <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 pb-28 pt-4">

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="text-center mb-12"
      >
        <p className="cx-rule-label mb-3">How it works</p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3" style={{ color: 'var(--cx-ink)' }}>
          Intelligence at every layer
        </h2>
        <p className="text-[15px] max-w-xl mx-auto" style={{ color: 'var(--cx-mute-1)' }}>
          Four tightly integrated components that turn raw documents into precise, cited answers.
        </p>
      </motion.div>

      {/* Feature cards bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.07, duration: 0.5, ease }}
              className={`relative overflow-hidden rounded-[2rem] p-8 md:p-10 border z-0 group transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl ${card.wide ? "md:col-span-2" : ""}`}
              style={{
                background: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(24px) saturate(150%)',
                WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                borderColor: 'rgba(255,255,255,0.3)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              {/* Expanding ink circle on hover */}
              <div className="absolute z-[-1] -top-8 -right-8 h-16 w-16 rounded-full transform scale-100 origin-center transition-transform duration-[1100ms] ease-in-out group-hover:scale-[80]"
                style={{ background: 'var(--cx-ink)' }} />

              {/* Arrow badge */}
              <div className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center rounded-bl-[2rem] overflow-hidden z-10 border-b border-l"
                style={{ background: 'var(--cx-ink)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <ArrowUpRight size={18} className="text-white -mr-0.5 -mt-0.5" />
              </div>

              <div className="relative z-10">
                {/* Icon */}
                <div className="size-12 rounded-2xl flex items-center justify-center mb-7 border transition-colors duration-[800ms]"
                  style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
                  onMouseEnter={() => {}}
                >
                  <Icon size={22} style={{ color: 'var(--cx-accent)' }}
                    className="group-hover:!text-white transition-colors duration-[800ms]" />
                </div>

                <h3 className={`font-semibold tracking-tight mb-3 transition-colors duration-[800ms] group-hover:text-white ${card.wide ? "text-2xl md:text-[1.7rem]" : "text-xl md:text-2xl"}`}
                  style={{ color: 'var(--cx-ink)' }}>
                  {card.title}
                </h3>
                <p className={`leading-relaxed transition-colors duration-[800ms] group-hover:text-zinc-300 ${card.wide ? "text-[15px] max-w-lg" : "text-[14.5px]"}`}
                  style={{ color: 'var(--cx-mute-1)' }}>
                  {card.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
