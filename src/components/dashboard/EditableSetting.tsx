'use client'

import { useState } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'

type SaveResult = { error?: string; success?: boolean } | void

export function EditableSetting({
  label,
  value,
  onSave,
}: {
  label: string
  value: string
  onSave: (v: string) => Promise<SaveResult>
}) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    const v = draft.trim()
    if (!v || v === current) { setEditing(false); return }
    setSaving(true); setErr(null)
    const res = await onSave(v)
    setSaving(false)
    if (res && res.error) { setErr(res.error); return }
    setCurrent(v); setEditing(false)
  }

  return (
    <div className="cx-panel p-4 mb-3 max-w-2xl">
      <p className="cx-rule-label mb-1.5">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={draft}
            maxLength={80}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') { setDraft(current); setEditing(false); setErr(null) }
            }}
            className="flex-1 h-9 px-3 rounded-lg border text-[13px] bg-transparent outline-none"
            style={{ borderColor: 'var(--cx-accent-line)', color: 'var(--cx-ink)' }}
          />
          <button
            onClick={save}
            disabled={saving}
            aria-label="Save"
            className="size-9 rounded-lg flex items-center justify-center hover:bg-[var(--cx-paper-2)]"
            style={{ color: 'var(--cx-ok)' }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
          </button>
          <button
            onClick={() => { setDraft(current); setEditing(false); setErr(null) }}
            aria-label="Cancel"
            className="size-9 rounded-lg flex items-center justify-center hover:bg-[var(--cx-paper-2)]"
            style={{ color: 'var(--cx-mute-2)' }}
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[13.5px] font-medium truncate" style={{ color: 'var(--cx-ink)' }}>
            {current}
          </span>
          <button
            onClick={() => { setDraft(current); setEditing(true) }}
            aria-label={`Edit ${label.toLowerCase()}`}
            className="size-9 rounded-lg flex items-center justify-center hover:bg-[var(--cx-paper-2)]"
            style={{ color: 'var(--cx-mute-1)' }}
          >
            <Pencil size={13} />
          </button>
        </div>
      )}
      {err && <p className="text-[12px] mt-1.5" style={{ color: 'var(--cx-err)' }}>{err}</p>}
    </div>
  )
}
