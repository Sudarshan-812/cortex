import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getAccessToken } from '@/lib/backend'

export async function GET(req: NextRequest) {
  const parent = req.nextUrl.searchParams.get('parent') || 'root'

  const token = await getAccessToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await backendFetch(
    `/v1/connectors/google-drive/folders?parent=${encodeURIComponent(parent)}`,
    token,
  )
  const body = await res.json().catch(() => ({ error: 'Could not list folders' }))
  return NextResponse.json(body, { status: res.status })
}
