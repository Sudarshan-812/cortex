'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network } from 'lucide-react'

type Doc = { id: string; name: string; topics?: string[] | null }

type GraphNode = {
  id: string
  label: string
  type: 'doc' | 'topic'
  x: number
  y: number
  vx: number
  vy: number
}

type GraphEdge = { source: string; target: string }

const DOC_COLOR   = 'var(--cx-accent)'
const TOPIC_COLOR = 'var(--cx-ok)'
const LINK_ALPHA  = 0.35

function buildGraph(docs: Doc[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const topicSet = new Map<string, string>() // label → id

  docs.forEach((doc, i) => {
    const angle = (i / docs.length) * Math.PI * 2
    const r = 120
    nodes.push({
      id: doc.id,
      label: doc.name.replace(/\.(pdf|docx|doc|txt|md|csv)$/i, '').slice(0, 22),
      type: 'doc',
      x: 200 + Math.cos(angle) * r + (Math.random() - 0.5) * 40,
      y: 200 + Math.sin(angle) * r + (Math.random() - 0.5) * 40,
      vx: 0, vy: 0,
    })
    const topics = Array.isArray(doc.topics) ? doc.topics : []
    topics.slice(0, 5).forEach(topic => {
      const normalised = topic.toLowerCase().trim()
      if (!topicSet.has(normalised)) {
        const tid = `topic-${topicSet.size}`
        topicSet.set(normalised, tid)
        nodes.push({
          id: tid,
          label: topic.slice(0, 20),
          type: 'topic',
          x: 200 + (Math.random() - 0.5) * 300,
          y: 200 + (Math.random() - 0.5) * 300,
          vx: 0, vy: 0,
        })
      }
      edges.push({ source: doc.id, target: topicSet.get(normalised)! })
    })
  })

  return { nodes, edges }
}

function runLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  steps: number
) {
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1))
  const cx = width / 2
  const cy = height / 2

  for (let step = 0; step < steps; step++) {
    const cooling = 1 - step / steps
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1)
        const force = (k * k) / dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        nodes[i].vx += fx; nodes[i].vy += fy
        nodes[j].vx -= fx; nodes[j].vy -= fy
      }
    }
    // Attraction along edges
    for (const edge of edges) {
      const s = nodes.find(n => n.id === edge.source)
      const t = nodes.find(n => n.id === edge.target)
      if (!s || !t) continue
      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1)
      const force = (dist * dist) / k
      const fx = (dx / dist) * force * 0.6
      const fy = (dy / dist) * force * 0.6
      s.vx += fx; s.vy += fy
      t.vx -= fx; t.vy -= fy
    }
    // Gravity toward center
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.015
      n.vy += (cy - n.y) * 0.015
    }
    // Apply velocity with cooling
    const maxV = 8
    for (const n of nodes) {
      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy)
      if (speed > maxV) { n.vx = (n.vx / speed) * maxV; n.vy = (n.vy / speed) * maxV }
      n.x = Math.max(30, Math.min(width - 30, n.x + n.vx * cooling))
      n.y = Math.max(30, Math.min(height - 30, n.y + n.vy * cooling))
      n.vx *= 0.85; n.vy *= 0.85
    }
  }
}

export function KnowledgeGraph({ documents }: { documents: Doc[] }) {
  const [expanded, setExpanded] = useState(false)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const W = 400, H = 340

  const docsWithTopics = documents.filter(d => Array.isArray(d.topics) && d.topics!.length > 0)

  useEffect(() => {
    if (!expanded || docsWithTopics.length === 0) return
    const { nodes: ns, edges: es } = buildGraph(docsWithTopics)
    runLayout(ns, es, W, H, 180)
    setNodes([...ns])
    setEdges(es)
  }, [expanded, documents.length])

  if (docsWithTopics.length === 0) return null

  return (
    <motion.div
      id="knowledge-graph"
      className="cx-panel overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-6 py-4 border-b transition-colors"
        style={{ borderColor: 'var(--cx-line)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <div className="flex items-center gap-3">
          <div
            className="size-8 rounded-lg flex items-center justify-center border"
            style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
          >
            <Network size={14} style={{ color: 'var(--cx-accent)' }} />
          </div>
          <div className="text-left">
            <p className="cx-rule-label mb-0.5">Knowledge Graph</p>
            <p className="text-[13.5px] font-semibold" style={{ color: 'var(--cx-ink)' }}>
              {docsWithTopics.length} doc{docsWithTopics.length !== 1 ? 's' : ''} · topic clusters
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-[11px] font-mono px-2 py-1 rounded border"
          style={{ color: 'var(--cx-mute-2)', borderColor: 'var(--cx-line)', background: 'var(--cx-paper-2)' }}
        >
          {expanded ? 'Collapse ↑' : 'Expand ↓'}
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div ref={containerRef} className="relative px-4 py-4">
              {nodes.length === 0 ? (
                <div className="flex items-center justify-center h-[340px]">
                  <div className="size-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cx-accent)' }} />
                </div>
              ) : (
                <svg
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full"
                  style={{ maxHeight: H }}
                >
                  {/* Edges */}
                  {edges.map((e, i) => {
                    const s = nodes.find(n => n.id === e.source)
                    const t = nodes.find(n => n.id === e.target)
                    if (!s || !t) return null
                    const isHovered = hovered === e.source || hovered === e.target
                    return (
                      <line
                        key={i}
                        x1={s.x} y1={s.y}
                        x2={t.x} y2={t.y}
                        stroke={isHovered ? 'var(--cx-accent)' : 'var(--cx-line-2)'}
                        strokeWidth={isHovered ? 1.5 : 1}
                        strokeOpacity={isHovered ? 0.7 : LINK_ALPHA}
                        style={{ transition: 'stroke 0.2s, stroke-opacity 0.2s' }}
                      />
                    )
                  })}

                  {/* Nodes */}
                  {nodes.map(node => {
                    const isDoc   = node.type === 'doc'
                    const r       = isDoc ? 9 : 6
                    const hover   = hovered === node.id
                    const connected = hovered
                      ? edges.some(e => (e.source === hovered && e.target === node.id) || (e.target === hovered && e.source === node.id))
                      : false

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x},${node.y})`}
                        style={{ cursor: 'default' }}
                        onMouseEnter={() => setHovered(node.id)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <circle
                          r={hover ? r + 3 : r}
                          fill={isDoc ? DOC_COLOR : TOPIC_COLOR}
                          fillOpacity={hover || connected ? 0.9 : 0.65}
                          stroke={hover ? '#fff' : 'var(--cx-surface)'}
                          strokeWidth={hover ? 2 : 1.5}
                          style={{ transition: 'r 0.18s, fill-opacity 0.18s' }}
                        />
                        <text
                          textAnchor="middle"
                          dy={r + 11}
                          className="select-none pointer-events-none"
                          style={{
                            fontSize: hover ? 9.5 : 8.5,
                            fill: hover ? 'var(--cx-ink)' : 'var(--cx-mute-1)',
                            fontFamily: 'inherit',
                            fontWeight: hover ? 600 : 400,
                            transition: 'font-size 0.18s',
                          }}
                        >
                          {node.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}

              {/* Legend */}
              <div className="flex items-center gap-5 mt-2 px-1">
                {[
                  { color: DOC_COLOR,   label: 'Document' },
                  { color: TOPIC_COLOR, label: 'Topic' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full flex-shrink-0" style={{ background: color, opacity: 0.8 }} />
                    <span className="text-[11px] cx-num" style={{ color: 'var(--cx-mute-1)' }}>{label}</span>
                  </div>
                ))}
                <span className="text-[10.5px] ml-auto" style={{ color: 'var(--cx-mute-2)' }}>Hover a node to highlight connections</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
