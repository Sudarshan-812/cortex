import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getAccessToken } from '@/lib/backend'

// A large Drive folder can take a while to parse + embed.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { folderId } = await req.json().catch(() => ({}))
  if (!folderId) return NextResponse.json({ error: 'Missing folderId' }, { status: 400 })

  const token = await getAccessToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await backendFetch('/v1/connectors/google-drive/sync', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_id: folderId }),
  })
  const body = await res.json().catch(() => ({ error: 'Sync failed' }))
  return NextResponse.json(body, { status: res.status })
}
