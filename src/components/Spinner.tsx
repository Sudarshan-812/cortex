export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-4', md: 'size-8', lg: 'size-12' }
  const borders = { sm: 'border-2', md: 'border-2', lg: 'border-[3px]' }

  return (
    <div
      className={`${sizes[size]} ${borders[size]} rounded-full border-zinc-200 border-t-fuchsia-500 animate-spin`}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-[13px] font-medium text-zinc-400 animate-pulse">Loading…</p>
      </div>
    </div>
  )
}
