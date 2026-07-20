'use client'

import { motion } from 'framer-motion'

export function PageHeader({
  icon,
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
    >
      <div className="flex items-start gap-3.5">
        {icon && <div className="cx-icon-chip cx-icon-chip-lg">{icon}</div>}
        <div>
          <p className="cx-rule-label mb-1">{eyebrow}</p>
          <h1
            className="cx-display text-[26px] md:text-[30px] font-bold tracking-[-0.02em] leading-[1.1]"
            style={{ color: 'var(--cx-ink)' }}
          >
            {title}
          </h1>
          {description && (
            <p className="text-[13px] mt-1.5 max-w-lg" style={{ color: 'var(--cx-mute-1)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </motion.div>
  )
}
