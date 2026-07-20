import { Sparkles } from 'lucide-react'

export function ChatTopBar({
  subtitle,
  children,
}: {
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between h-[50px] px-5 border-b"
      style={{ background: 'var(--cx-paper)', borderColor: 'var(--cx-line)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="size-6 rounded-lg flex items-center justify-center border flex-shrink-0"
          style={{ background: 'var(--cx-accent-wash)', borderColor: 'var(--cx-accent-line)' }}
        >
          <Sparkles size={12} style={{ color: 'var(--cx-accent)' }} />
        </div>
        <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: 'var(--cx-ink)' }}>Cortex</span>
        {subtitle && (
          <>
            <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--cx-mute-2)' }}>·</span>
            <span className="text-[12px] truncate" style={{ color: 'var(--cx-mute-1)' }}>{subtitle}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {children}
      </div>
    </div>
  )
}
