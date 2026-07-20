function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full ${className}`} style={{ background: 'var(--cx-paper-2)' }} />
}

export default function ChatLoading() {
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--cx-paper)' }}>
      {/* Top bar skeleton */}
      <div className="flex-shrink-0 flex items-center justify-between h-[50px] px-5 border-b" style={{ borderColor: 'var(--cx-line)' }}>
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded-lg animate-pulse" style={{ background: 'var(--cx-paper-2)' }} />
          <Pulse className="h-3 w-14" />
          <Pulse className="h-3 w-20" />
        </div>
        <Pulse className="h-3 w-24" />
      </div>

      {/* Message area skeleton */}
      <div className="flex-1 flex flex-col items-center px-6 pt-16 gap-5">
        <div className="w-full max-w-[720px] flex flex-col items-end gap-2">
          <Pulse className="h-9 w-64 rounded-2xl" />
        </div>
        <div className="w-full max-w-[720px] flex flex-col gap-2">
          <Pulse className="h-3.5 w-full max-w-[560px]" />
          <Pulse className="h-3.5 w-full max-w-[480px]" />
          <Pulse className="h-3.5 w-full max-w-[520px]" />
        </div>
      </div>

      {/* Input bar skeleton */}
      <div className="flex-shrink-0 px-6 pb-6 pt-2">
        <div className="max-w-[720px] mx-auto">
          <Pulse className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
