import { NextResponse } from 'next/server'
import { backendFetch, getAccessToken } from '@/lib/backend'

export async function POST() {
  const token = await getAccessToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await backendFetch('/v1/connectors/google-drive', token, { method: 'DELETE' })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
