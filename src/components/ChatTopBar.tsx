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
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles size={13} className="flex-shrink-0" style={{ color: 'var(--cx-accent)' }} />
        <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: 'var(--cx-ink)' }}>Cortex</span>
        {subtitle && (
          <>
            <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--cx-line-2)' }}>/</span>
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
