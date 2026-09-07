function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full ${className}`} style={{ background: 'var(--cx-paper-2)' }} />
}

export default function SettingsLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-10 pb-20">

        {/* Header skeleton */}
        <div className="flex items-start gap-3.5 mb-8">
          <div className="size-10 rounded-xl animate-pulse" style={{ background: 'var(--cx-paper-2)' }} />
          <div>
            <Pulse className="h-2.5 w-16 mb-2" />
            <Pulse className="h-7 w-36" />
          </div>
        </div>

        <div className="max-w-2xl space-y-4">
          {/* Avatar card skeleton */}
          <div className="cx-panel flex items-center gap-5 p-5">
            <div className="h-14 w-14 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--cx-paper-2)' }} />
            <div className="space-y-2 flex-1">
              <Pulse className="h-4 w-36" />
              <Pulse className="h-3 w-48" />
            </div>
          </div>

          {/* Section skeletons */}
          {[1, 2, 3].map(i => (
            <div key={i} className="cx-panel overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--cx-line)' }}>
                <div className="size-8 rounded-xl animate-pulse" style={{ background: 'var(--cx-paper-2)' }} />
                <div className="space-y-1.5">
                  <Pulse className="h-3.5 w-28" />
                  <Pulse className="h-2.5 w-44" />
                </div>
              </div>
              {[1, 2].map(j => (
                <div key={j} className="flex items-center justify-between px-5 py-3.5">
                  <Pulse className="h-3 w-24" />
                  <Pulse className="h-3 w-32" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
