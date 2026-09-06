function Pulse({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded ${className}`} style={{ background: "var(--cx-paper-2)", ...style }} />
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">

        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b" style={{ borderColor: "var(--cx-line)" }}>
          <div>
            <Pulse className="h-2.5 w-20 mb-1.5" />
            <Pulse className="h-5 w-56 mb-2" />
            <Pulse className="h-3 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Pulse className="h-8 w-20" />
            <Pulse className="h-8 w-40" />
          </div>
        </div>

        {/* Metrics strip skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 mb-5 border rounded-lg overflow-hidden divide-x" style={{ borderColor: "var(--cx-line)" }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3.5">
              <Pulse className="h-2.5 w-16 mb-2" />
              <Pulse className="h-5 w-14" />
            </div>
          ))}
        </div>

        {/* Upload zone skeleton */}
        <div className="cx-panel p-4 mb-5">
          <Pulse className="h-3.5 w-24 mb-3" />
          <div className="rounded-md border border-dashed h-24" style={{ borderColor: "var(--cx-line-2)" }} />
        </div>

        {/* Document table skeleton */}
        <div className="cx-panel overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cx-line)" }}>
            <Pulse className="h-3.5 w-24" />
          </div>
          <div className="divide-y" style={{ borderColor: "var(--cx-line)" }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <Pulse className="h-3 flex-1 max-w-[200px]" />
                <Pulse className="h-3 w-16" />
                <Pulse className="h-3 w-12" />
                <Pulse className="h-3 w-12" />
                <Pulse className="h-3 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
