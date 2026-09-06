'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Zap, Database, FileSearch, BrainCircuit, ExternalLink, LucideIcon } from "lucide-react";

const sections: { icon: LucideIcon; title: string; description: string; items: string[] }[] = [
  {
    icon: Zap,
    title: "Quick Start",
    description: "Get up and running in under 5 minutes. Create a workspace, upload a document, and ask your first question.",
    items: ["Create an account", "Upload your first PDF", "Ask a question", "View source citations"],
  },
  {
    icon: Database,
    title: "RAG Pipeline",
    description: "Understand how Cortex processes and indexes your documents using 768-dim Matryoshka embeddings.",
    items: ["Document chunking strategy", "Embedding model details", "pgvector storage", "Index management"],
  },
  {
    icon: FileSearch,
    title: "Hybrid Search",
    description: "Learn how Cortex combines vector cosine similarity with BM25 keyword search for best-in-class retrieval.",
    items: ["Vector search explained", "BM25 keyword fusion", "Reciprocal Rank Fusion (RRF)", "Search tuning"],
  },
  {
    icon: BrainCircuit,
    title: "AI Re-ranking",
    description: "Gemini evaluates the top retrieved chunks and re-orders them by semantic relevance before generation.",
    items: ["Re-ranking architecture", "Relevance scoring", "Agentic reasoning", "Source citation logic"],
  },
];

const ease = [0.16, 1, 0.3, 1] as const

export default function DocsContent() {
  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--cx-paper)', color: 'var(--cx-ink)' }}>

      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{ background: 'rgba(246,245,242,0.88)', borderColor: 'var(--cx-line)' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-[58px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[12.5px] font-medium transition-opacity hover:opacity-60"
              style={{ color: 'var(--cx-mute-1)' }}
            >
              <ArrowLeft size={13} />
              Back to Cortex
            </Link>
            <span style={{ color: 'var(--cx-line-2)' }}>/</span>
            <div className="flex items-center gap-1.5">
              <BookOpen size={13} style={{ color: 'var(--cx-mute-2)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--cx-ink)' }}>Documentation</span>
            </div>
          </div>
          <Link
            href="/login"
            className="h-7 px-3.5 inline-flex items-center rounded-full text-[12.5px] font-medium transition-colors cx-btn-ink"
          >
            Get started
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-14"
        >
          <p className="cx-rule-label mb-3">Cortex Docs</p>
          <h1 className="text-4xl font-semibold tracking-tight mb-4" style={{ color: 'var(--cx-ink)' }}>
            Documentation
          </h1>
          <p className="text-[16px] leading-relaxed max-w-2xl" style={{ color: 'var(--cx-mute-1)' }}>
            Everything you need to use Cortex - from uploading your first document to understanding the RAG pipeline under the hood.
          </p>
        </motion.div>

        {/* Section cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
          {sections.map((section, i) => {
            const Icon = section.icon
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.45, ease }}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="cx-panel p-6 cursor-default"
              >
                <div
                  className="size-10 rounded-xl flex items-center justify-center mb-4 border"
                  style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
                >
                  <Icon size={18} style={{ color: 'var(--cx-accent)' }} />
                </div>
                <h2 className="text-[14.5px] font-semibold mb-1.5" style={{ color: 'var(--cx-ink)' }}>
                  {section.title}
                </h2>
                <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--cx-mute-1)' }}>
                  {section.description}
                </p>
                <ul className="space-y-1.5">
                  {section.items.map((item, j) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.08 + j * 0.04, duration: 0.3, ease }}
                      className="flex items-center gap-2 text-[12.5px]"
                      style={{ color: 'var(--cx-ink-2)' }}
                    >
                      <span className="size-1 rounded-full flex-shrink-0" style={{ background: 'var(--cx-mute-2)' }} />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5, ease }}
          className="p-10 rounded-2xl text-center"
          style={{
            background: 'var(--cx-ink)',
            boxShadow: '0 20px 60px rgba(10,10,10,0.2), 0 1px 0 rgba(255,255,255,0.05) inset',
          }}
        >
          <h2 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: '#f6f5f2' }}>
            Ready to get started?
          </h2>
          <p className="text-[14px] mb-7" style={{ color: 'rgba(246,245,242,0.55)' }}>
            Create your free workspace and upload your first document in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
              <Link
                href="/login"
                className="inline-flex px-6 py-2.5 rounded-full text-[13.5px] font-semibold transition-colors"
                style={{ background: '#f6f5f2', color: 'var(--cx-ink)' }}
              >
                Create Free Account
              </Link>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
              <a
                href="https://github.com/Sudarshan-812"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[13.5px] font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(246,245,242,0.7)' }}
              >
                View on GitHub <ExternalLink size={13} />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
