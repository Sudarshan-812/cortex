import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Zap, Database, FileSearch, BrainCircuit, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Docs",
  description: "Learn how to use Cortex — upload documents, query your knowledge base, and integrate via API.",
};

const sections = [
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

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-950 transition-colors">
              <ArrowLeft className="size-3.5" />
              Back to Cortex
            </Link>
            <span className="text-zinc-200">/</span>
            <div className="flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-zinc-400" />
              <span className="text-[13px] font-semibold text-zinc-900">Documentation</span>
            </div>
          </div>
          <Link
            href="/login"
            className="h-7 px-3.5 inline-flex items-center bg-zinc-950 text-white rounded-full text-[12.5px] font-medium hover:bg-zinc-800 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-14">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 mb-4">Documentation</h1>
          <p className="text-lg text-zinc-500 max-w-2xl leading-relaxed">
            Everything you need to use Cortex — from uploading your first document to understanding the RAG pipeline under the hood.
          </p>
        </div>

        {/* Sections grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="p-6 rounded-2xl border border-zinc-200/80 bg-white hover:shadow-lg hover:shadow-zinc-900/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="size-10 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center mb-4">
                  <Icon className="size-5 text-zinc-700" />
                </div>
                <h2 className="text-[15px] font-bold text-zinc-900 mb-2">{section.title}</h2>
                <p className="text-[13.5px] text-zinc-500 leading-relaxed mb-4">{section.description}</p>
                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[13px] text-zinc-600">
                      <span className="size-1 rounded-full bg-zinc-300 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="p-8 rounded-2xl border border-zinc-200/80 bg-zinc-950 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to get started?</h2>
          <p className="text-zinc-400 mb-6 text-[15px]">Create your free workspace and upload your first document in minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-white text-zinc-950 rounded-full text-[14px] font-semibold hover:bg-zinc-100 transition-colors"
            >
              Create Free Account
            </Link>
            <a
              href="https://github.com/Sudarshan-812"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-full text-[14px] font-semibold hover:bg-zinc-700 transition-colors"
            >
              View on GitHub <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
