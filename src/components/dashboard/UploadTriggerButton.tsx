'use client'

import { UploadCloud } from 'lucide-react'

/** Opens the hidden file input inside <UploadZoneNew> (id="cx-upload-input")
 *  and scrolls it into view. Used by the dashboard header + empty state. */
export function UploadTriggerButton({
  className,
  label = 'Upload',
}: {
  className?: string
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.getElementById('cx-upload-input') as HTMLInputElement | null
        document.getElementById('upload-zone')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.click()
      }}
      className={className}
    >
      <UploadCloud size={13} /> {label}
    </button>
  )
}
