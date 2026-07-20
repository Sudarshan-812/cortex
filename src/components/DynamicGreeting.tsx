'use client'

import { useMemo } from 'react'

type Greeting = { text: string; sub: string }

function getGreeting(): Greeting {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return { text: 'Good morning', sub: 'Ready to explore your documents?' }
  if (hour >= 12 && hour < 17) return { text: 'Good afternoon', sub: 'What would you like to research today?' }
  if (hour >= 17 && hour < 21) return { text: 'Good evening', sub: "Let's make the most of your evening." }
  return { text: 'Good night', sub: "Still at it\u2014I'm here to help." }
}

export function DynamicGreeting() {
  const greeting = useMemo(() => getGreeting(), [])

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <h2
        className="cx-display text-[1.9rem] font-bold tracking-[-0.02em] leading-tight"
        style={{ color: 'var(--cx-ink)' }}
      >
        {greeting.text},{' '}
        <span style={{ color: 'var(--cx-accent)' }}>I&apos;m Cortex</span>
      </h2>
      <p className="text-[13.5px]" style={{ color: 'var(--cx-mute-1)' }}>
        {greeting.sub}
      </p>
    </div>
  )
}
