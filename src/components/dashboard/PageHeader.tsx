export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  icon?: React.ReactNode
  eyebrow: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 pb-5 border-b" style={{ borderColor: 'var(--cx-line)' }}>
      <div>
        <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--cx-mute-2)' }}>{eyebrow}</p>
        <h1 className="text-[20px] font-semibold tracking-tight leading-tight" style={{ color: 'var(--cx-ink)' }}>
          {title}
        </h1>
        {description && (
          <p className="text-[13px] mt-1 max-w-lg" style={{ color: 'var(--cx-mute-1)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
