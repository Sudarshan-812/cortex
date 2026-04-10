'use client'

import { useMemo } from 'react'

type Greeting = {
  text: string
  sub: string
  emoji: string
  gradient: string
}

function getGreeting(): Greeting {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return {
      text: 'Good morning',
      sub: 'Ready to dive into your documents?',
      emoji: '☀️',
      gradient: 'from-amber-400 via-orange-400 to-rose-400',
    }
  }
  if (hour >= 12 && hour < 17) {
    return {
      text: 'Good afternoon',
      sub: 'What would you like to explore today?',
      emoji: '🌤️',
      gradient: 'from-sky-400 via-blue-400 to-indigo-400',
    }
  }
  if (hour >= 17 && hour < 21) {
    return {
      text: 'Good evening',
      sub: "Let's make the most of your evening.",
      emoji: '🌇',
      gradient: 'from-violet-400 via-fuchsia-400 to-pink-400',
    }
  }
  return {
    text: 'Good night',
    sub: "Still at it? I'm here to help.",
    emoji: '🌙',
    gradient: 'from-indigo-400 via-violet-500 to-purple-600',
  }
}

export function DynamicGreeting() {
  const greeting = useMemo(() => getGreeting(), [])

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-4xl mb-1 select-none" role="img" aria-label={greeting.text}>
        {greeting.emoji}
      </span>
      <h2 className="text-[1.85rem] font-bold tracking-tight text-zinc-950 leading-tight">
        {greeting.text},{' '}
        <span className={`bg-gradient-to-r ${greeting.gradient} bg-clip-text text-transparent`}>
          I&apos;m Cortex
        </span>
      </h2>
      <p className="text-zinc-400 text-[14px] font-medium mt-1">
        {greeting.sub}
      </p>
    </div>
  )
}
