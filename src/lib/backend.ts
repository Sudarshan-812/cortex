import { createClient } from '@/utils/supabase/server'

const BASE = (process.env.BACKEND_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/** The logged-in user's Supabase access token (verified by the Python backend via JWKS). */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function backendUrl(path: string): string {
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`
}

/** Fetch the Python backend with the user's bearer token attached. */
export async function backendFetch(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(backendUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
}
