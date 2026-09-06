import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center font-sans"
      style={{ background: 'var(--cx-paper)', color: 'var(--cx-ink)' }}
    >
      <div className="text-center max-w-md px-6">
        <div className="flex justify-center mb-6">
          <Image src="/CortexLogo.png" alt="Cortex" width={36} height={36} className="object-contain opacity-60" />
        </div>
        <p className="cx-rule-label mb-3">404</p>
        <h1 className="text-[28px] font-semibold tracking-tight mb-3" style={{ color: 'var(--cx-ink)' }}>
          Page not found
        </h1>
        <p className="text-[13.5px] leading-relaxed mb-8" style={{ color: 'var(--cx-mute-1)' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="cx-btn-ink h-9 px-5 rounded-full text-[13px] font-medium inline-flex items-center"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
