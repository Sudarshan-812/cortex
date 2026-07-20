function Pulse({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-full ${className}`} style={{ background: "var(--cx-paper-2)", ...style }} />
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-10 pb-16">

        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <Pulse className="h-3 w-32 mb-5" />
            <Pulse className="h-10 w-72 mb-3" style={{ borderRadius: 8 }} />
            <Pulse className="h-3.5 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Pulse className="h-9 w-24" />
            <Pulse className="h-9 w-40" />
          </div>
        </div>

        {/* Metrics grid skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="cx-panel p-5">
              <Pulse className="h-2.5 w-16 mb-4" />
              <Pulse className="h-8 w-20 mb-2" style={{ borderRadius: 6 }} />
              <Pulse className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Upload zone skeleton */}
        <div className="cx-panel p-5 mb-6">
          <Pulse className="h-2.5 w-14 mb-2" />
          <Pulse className="h-3.5 w-40 mb-4" />
          <div className="rounded-xl border border-dashed h-28" style={{ borderColor: "var(--cx-line-2)" }} />
        </div>

        {/* Document table skeleton */}
        <div className="cx-panel overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--cx-line)" }}>
            <Pulse className="h-2.5 w-20 mb-1.5" />
            <Pulse className="h-4 w-36" />
          </div>
          <div className="divide-y" style={{ borderColor: "var(--cx-line)" }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                <Pulse className="h-3.5 flex-1 max-w-[220px]" />
                <Pulse className="h-3.5 w-16" />
                <Pulse className="h-3.5 w-12" />
                <Pulse className="h-3.5 w-16" />
                <Pulse className="h-5 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
