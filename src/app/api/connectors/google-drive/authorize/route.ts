import { NextRequest, NextResponse } from 'next/server'
import { backendFetch, getAccessToken } from '@/lib/backend'

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }
  const token = await getAccessToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await backendFetch(
    `/v1/connectors/google-drive/authorize?workspace_id=${encodeURIComponent(workspaceId)}`,
    token,
  )
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
