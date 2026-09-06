'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center font-sans"
      style={{ background: 'var(--cx-paper)', color: 'var(--cx-ink)' }}
    >
      <div className="text-center max-w-md px-6">
        <div className="flex justify-center mb-6">
          <Image src="/CortexLogo.png" alt="Cortex" width={36} height={36} className="object-contain opacity-60" />
        </div>
        <p className="cx-rule-label mb-3">Error</p>
        <h1 className="text-[28px] font-semibold tracking-tight mb-3" style={{ color: 'var(--cx-ink)' }}>
          Something went wrong
        </h1>
        <p className="text-[13.5px] leading-relaxed mb-8" style={{ color: 'var(--cx-mute-1)' }}>
          An unexpected error occurred. You can try again or return to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="cx-btn-ghost h-9 px-5 rounded-full text-[13px] font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="cx-btn-ink h-9 px-5 rounded-full text-[13px] font-medium flex items-center"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
