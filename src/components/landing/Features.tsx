"use client";

import { motion } from "framer-motion";
import { Database, FileSearch, BrainCircuit, Zap } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const cards = [
  {
    icon: Database,
    label: "01",
    title: "Answers Grounded in Your Documents",
    description: "Documents are chunked and embedded using Matryoshka Representation Learning (768-dim) and stored securely in pgvector via Supabase.",
    wide: true,
  },
  {
    icon: FileSearch,
    label: "02",
    title: "Finds What You Mean, Not Just What You Type",
    description: "Merging vector cosine similarity with BM25 keyword search via Reciprocal Rank Fusion for best-in-class retrieval.",
    wide: false,
  },
  {
    icon: BrainCircuit,
    label: "03",
    title: "AI Picks the Most Relevant Sources",
    description: "Top 10 chunks are dynamically re-ranked by Gemini before being fed into the agentic reasoning engine.",
    wide: false,
  },
  {
    icon: Zap,
    label: "04",
    title: "Answers Stream Instantly, No Waiting",
    description: "Agentic decisions and final answers are streamed back instantly using Server-Sent Events, ensuring a liquid-smooth user experience.",
    wide: true,
  },
];

function FeatureCard({ card, i }: { card: typeof cards[0]; i: number }) {
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: i * 0.07, duration: 0.5, ease }}
      className={card.wide ? "md:col-span-2" : ""}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          borderColor: 'rgba(255,255,255,0.5)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
        }}
        className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 border group h-full"
      >
        {/* Faint step label */}
        <span
          className="absolute top-7 right-8 text-[11px] font-semibold tracking-widest cx-num select-none"
          style={{ color: 'rgba(10,10,10,0.3)' }}
        >
          {card.label}
        </span>

        {/* Icon with spring hover */}
        <motion.div
          whileHover={{ scale: 1.12, rotate: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="size-12 flex items-center justify-center mb-7 w-fit"
          style={{}}
        >
          <Icon size={22} style={{ color: '#7a1f5a' }} />
        </motion.div>

        <h3
          className={`font-semibold tracking-tight mb-3 ${card.wide ? "text-2xl md:text-[1.7rem]" : "text-xl md:text-2xl"}`}
          style={{ color: 'rgba(10,10,10,0.92)' }}
        >
          {card.title}
        </h3>

        <p
          className={`leading-relaxed ${card.wide ? "text-[15px] max-w-lg" : "text-[14.5px]"}`}
          style={{ color: 'rgba(10,10,10,0.65)' }}
        >
          {card.description}
        </p>

        {/* Accent bottom rule */}
        <div
          className="absolute bottom-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(90deg, transparent, var(--cx-accent-line), transparent)' }}
        />
      </div>
    </motion.div>
  );
}

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <FeatureCard key={card.title} card={card} i={i} />
        ))}
      </div>
    </section>
  );
}
