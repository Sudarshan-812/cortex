"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FileText, MessageSquare, Zap, HardDrive, ArrowRight } from "lucide-react"

import { DynamicGreeting } from "@/components/DynamicGreeting"
import { HomeComposer } from "@/components/home/HomeComposer"
import { UploadZoneNew } from "@/components/dashboard/UploadZoneNew"
import { DocumentTable } from "@/components/dashboard/DocumentTable"
import { KnowledgeGraph } from "@/components/dashboard/KnowledgeGraph"
import { UploadTriggerButton } from "@/components/dashboard/UploadTriggerButton"
import { buildSuggestedPrompts } from "@/lib/prompts"

type Doc = {
  id: string
  name: string
  size_bytes: number
  created_at: string
  summary?: string | null
  topics?: string[] | null
  source_type?: string | null
  external_id?: string | null
  last_synced_at?: string | null
}

type Session = { id: string; title: string; updated_at: string }

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.03 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
}

export function HomeView({
  workspace,
  documents,
  docCount,
  recentSessions,
  storageMB,
  driveConnected,
}: {
  workspace: { id: string; name: string }
  documents: Doc[]
  docCount: number
  recentSessions: Session[]
  storageMB: number
  driveConnected: boolean
}) {
  const isEmpty = docCount === 0
  const docNames = documents.map(d => d.name)
  const hasKnowledgeGraph = documents.some(d => Array.isArray(d.topics) && d.topics.length > 0)

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background — a quiet, static echo of the landing page's warm
          ink/gold field. No WebGL here: this page is seen every session, so
          it stays CSS-only (a couple of soft radial washes + the shared paper
          grain texture) rather than paying shader cost on every visit. */}
      <div aria-hidden className="cx-grain pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--paper)" }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 45% at 12% -8%, var(--gold-wash), transparent 60%)," +
            "radial-gradient(55% 45% at 100% 0%, var(--bronze-wash), transparent 65%)",
        }}
      />

      <motion.div
        className="relative z-10 max-w-[880px] mx-auto px-6 pt-12 pb-16"
        variants={stagger}
        initial="hidden"
        animate="show"
      >

        {/* Ask ------------------------------------------------------- */}
        <motion.div variants={fadeUp}>
          <DynamicGreeting />
        </motion.div>

        <motion.div variants={fadeUp} className="mt-6">
          <HomeComposer
            workspaceId={workspace.id}
            suggestions={recentSessions.length === 0 ? buildSuggestedPrompts(docNames) : []}
          />
        </motion.div>

        {/* Recent chats ------------------------------------------------ */}
        {recentSessions.length > 0 && (
          <motion.div variants={fadeUp} className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            {recentSessions.map(s => (
              <Link
                key={s.id}
                href={`/chat/${s.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors hover:bg-[var(--cx-paper-2)] max-w-[240px]"
                style={{ borderColor: "var(--cx-line)", color: "var(--cx-mute-1)" }}
              >
                <MessageSquare size={11} style={{ color: "var(--cx-mute-2)" }} className="shrink-0" />
                <span className="truncate">{s.title}</span>
              </Link>
            ))}
            <Link
              href="/chat"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--cx-paper-2)]"
              style={{ color: "var(--cx-accent)" }}
            >
              View all <ArrowRight size={11} />
            </Link>
          </motion.div>
        )}

        {/* Documents ------------------------------------------------- */}
        <motion.div variants={fadeUp} className="mt-10 pt-8 border-t" style={{ borderColor: "var(--cx-line)" }}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--cx-ink)" }}>
                Your documents
              </h3>
              <p className="text-[12.5px] mt-0.5" style={{ color: "var(--cx-mute-1)" }}>
                <span className="cx-num" style={{ color: "var(--cx-ink-2)" }}>{docCount}</span>{" "}
                document{docCount !== 1 ? "s" : ""} in {workspace.name}
                {driveConnected && (
                  <>
                    {" · "}
                    <Link href="/analytics#google-drive" className="inline-flex items-center gap-1 hover:underline">
                      <HardDrive size={11} style={{ color: "var(--cx-accent)" }} /> Drive connected
                    </Link>
                  </>
                )}
              </p>
            </div>
            {!isEmpty && (
              <div className="flex items-center gap-2 shrink-0">
                <UploadTriggerButton
                  className="cx-btn-ghost h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5"
                />
              </div>
            )}
          </div>

          {isEmpty ? (
            <div className="cx-panel p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] mb-4" style={{ color: "var(--cx-mute-2)" }}>
                Getting started
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
                {[
                  { icon: <FileText size={14} />, step: "1", title: "Connect Google Drive", desc: "Link a Drive folder from the Dashboard, or upload PDF, DOCX or XLSX files directly." },
                  { icon: <Zap size={14} />, step: "2", title: "Cortex reads your files", desc: "Each document is parsed, split into passages, and indexed so it can be searched by meaning." },
                  { icon: <MessageSquare size={14} />, step: "3", title: "Ask, get cited answers", desc: "Ask in plain language. Cortex pulls the relevant passages and links every claim to its source." },
                ].map(({ icon, step, title, desc }) => (
                  <div key={step} className="flex gap-3">
                    <div className="cx-icon-chip cx-icon-chip-md">{icon}</div>
                    <div>
                      <p className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--cx-ink)" }}>
                        <span style={{ color: "var(--cx-mute-2)" }}>{step}.</span> {title}
                      </p>
                      <p className="text-[12px] leading-relaxed" style={{ color: "var(--cx-mute-1)" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link
                  href="/analytics#google-drive"
                  className="cx-btn-ink h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5"
                >
                  <HardDrive size={13} /> Connect Google Drive
                </Link>
                <UploadTriggerButton
                  label="Upload files"
                  className="cx-btn-ghost h-8 px-3 rounded-md text-[12.5px] font-medium flex items-center gap-1.5"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5" id="upload-zone">
                <UploadZoneNew workspaceId={workspace.id} />
              </div>

              {hasKnowledgeGraph && (
                <div className="mb-5">
                  <KnowledgeGraph documents={documents} />
                </div>
              )}

              <DocumentTable documents={documents} storageMB={storageMB} />
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
