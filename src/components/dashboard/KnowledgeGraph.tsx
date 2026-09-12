'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

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

// Above this many documents, unlimited per-doc topics would produce a
// topic-node count that grows faster than the doc count and crowds out the
// graph. Cap to the most-shared topics so the graph stays legible instead of
// just getting denser forever.
const MAX_TOPIC_NODES = 28

function buildGraph(docs: Doc[], seedW: number, seedH: number): { nodes: GraphNode[]; edges: GraphEdge[]; truncatedTopics: number } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const topicCount = new Map<string, number>()
  const topicDocs = new Map<string, { docId: string; label: string }[]>()

  docs.forEach(doc => {
    const topics = Array.isArray(doc.topics) ? doc.topics : []
    topics.slice(0, 5).forEach(topic => {
      const normalised = topic.toLowerCase().trim()
      topicCount.set(normalised, (topicCount.get(normalised) ?? 0) + 1)
      const list = topicDocs.get(normalised) ?? []
      list.push({ docId: doc.id, label: topic.slice(0, 20) })
      topicDocs.set(normalised, list)
    })
  })

  // Most-shared topics first - these are the ones actually worth showing as
  // connective tissue between documents.
  const keptTopics = [...topicCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOPIC_NODES)
    .map(([key]) => key)
  const truncatedTopics = Math.max(0, topicCount.size - keptTopics.length)

  docs.forEach((doc, i) => {
    const angle = (i / docs.length) * Math.PI * 2
    const r = Math.min(seedW, seedH) * 0.28
    nodes.push({
      id: doc.id,
      label: doc.name.replace(/\.(pdf|docx|doc|txt|md|csv)$/i, '').slice(0, 22),
      type: 'doc',
      x: seedW / 2 + Math.cos(angle) * r + (Math.random() - 0.5) * 40,
      y: seedH / 2 + Math.sin(angle) * r + (Math.random() - 0.5) * 40,
      vx: 0, vy: 0,
    })
  })

  keptTopics.forEach((normalised, i) => {
    const tid = `topic-${i}`
    const label = topicDocs.get(normalised)![0].label
    nodes.push({
      id: tid,
      label,
      type: 'topic',
      x: seedW / 2 + (Math.random() - 0.5) * seedW * 0.7,
      y: seedH / 2 + (Math.random() - 0.5) * seedH * 0.7,
      vx: 0, vy: 0,
    })
    for (const { docId } of topicDocs.get(normalised)!) {
      edges.push({ source: docId, target: tid })
    }
  })

  return { nodes, edges, truncatedTopics }
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

// Fixed size regardless of node count is what made this cramped once a
// workspace had many documents - the same 640x420 box just got denser.
// Instead the simulation's coordinate space grows with node count (so nodes
// keep breathing room), while the on-screen viewport stays a manageable
// height; zoom/pan lets you navigate the larger space.
function graphSize(nodeCount: number) {
  const w = Math.min(1600, Math.max(640, 640 + Math.max(0, nodeCount - 12) * 26))
  const h = Math.min(1000, Math.max(420, 420 + Math.max(0, nodeCount - 12) * 16))
  return { w, h }
}

export function KnowledgeGraph({ documents }: { documents: Doc[] }) {
  const [expanded, setExpanded] = useState(true)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [truncatedTopics, setTruncatedTopics] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const VIEWPORT_H = 420

  const docsWithTopics = documents.filter(d => Array.isArray(d.topics) && d.topics!.length > 0)
  const { w: W, h: H } = graphSize(docsWithTopics.length + Math.min(docsWithTopics.length * 5, MAX_TOPIC_NODES))
  // Dense graphs read worse with every topic label always drawn - keep doc
  // labels (fewer, more important) but only reveal topic labels on hover.
  const isDense = nodes.length > 26

  useEffect(() => {
    if (!expanded || docsWithTopics.length === 0) return
    const { nodes: ns, edges: es, truncatedTopics: tt } = buildGraph(docsWithTopics, W, H)
    runLayout(ns, es, W, H, 180)
    setNodes([...ns])
    setEdges(es)
    setTruncatedTopics(tt)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, documents.length])

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.min(2.5, Math.max(0.5, z - e.deltaY * 0.001)))
  }
  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }
  function onPointerUp() { dragRef.current = null }

  if (docsWithTopics.length === 0) return null

  return (
    <div id="knowledge-graph" className="cx-panel overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-paper)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <div className="flex items-center gap-3">
          <div
            className="cx-icon-chip cx-icon-chip-md"
            style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)', color: 'var(--cx-accent)' }}
          >
            <Network size={15} />
          </div>
          <div className="text-left">
            <p className="text-[13.5px] font-semibold" style={{ color: 'var(--cx-ink)' }}>
              Knowledge graph
            </p>
            <p className="text-[11.5px]" style={{ color: 'var(--cx-mute-2)' }}>
              {docsWithTopics.length} document{docsWithTopics.length !== 1 ? 's' : ''} · how your topics connect
            </p>
          </div>
        </div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--cx-mute-1)' }}>
          {expanded ? 'Hide' : 'Show'}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t"
            style={{ borderColor: 'var(--cx-line)' }}
          >
            <div ref={containerRef} className="relative px-4 py-4">
              {nodes.length === 0 ? (
                <div className="flex items-center justify-center" style={{ height: VIEWPORT_H }}>
                  <div className="size-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cx-accent)' }} />
                </div>
              ) : (
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ height: VIEWPORT_H, background: 'var(--cx-paper)', cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {/* Zoom controls */}
                <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                  {[
                    { icon: <ZoomIn size={12} />, onClick: () => setZoom(z => Math.min(2.5, z + 0.2)), label: 'Zoom in' },
                    { icon: <ZoomOut size={12} />, onClick: () => setZoom(z => Math.max(0.5, z - 0.2)), label: 'Zoom out' },
                    { icon: <RotateCcw size={11} />, onClick: () => { setZoom(1); setPan({ x: 0, y: 0 }) }, label: 'Reset view' },
                  ].map(({ icon, onClick, label }) => (
                    <button
                      key={label}
                      onClick={e => { e.stopPropagation(); onClick() }}
                      aria-label={label}
                      title={label}
                      className="size-6 rounded-md flex items-center justify-center border transition-colors"
                      style={{ background: 'var(--cx-surface)', borderColor: 'var(--cx-line)', color: 'var(--cx-mute-1)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-mute-1)')}
                    >
                      {icon}
                    </button>
                  ))}
                </div>

                <svg
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center',
                    transition: dragRef.current ? 'none' : 'transform 0.15s ease-out',
                  }}
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
                        {(isDoc || !isDense || hover || connected) && (
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
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-5 mt-2 px-1 flex-wrap">
                {[
                  { color: DOC_COLOR,   label: 'Document' },
                  { color: TOPIC_COLOR, label: 'Topic' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full flex-shrink-0" style={{ background: color, opacity: 0.8 }} />
                    <span className="text-[11px] cx-num" style={{ color: 'var(--cx-mute-1)' }}>{label}</span>
                  </div>
                ))}
                {truncatedTopics > 0 && (
                  <span className="text-[10.5px] cx-num" style={{ color: 'var(--cx-mute-2)' }}>
                    +{truncatedTopics} more topics not shown (top {MAX_TOPIC_NODES})
                  </span>
                )}
                <span className="text-[10.5px] ml-auto" style={{ color: 'var(--cx-mute-2)' }}>
                  {isDense ? 'Drag to pan, scroll to zoom, hover to highlight' : 'Hover a node to highlight connections'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
