'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cx-sidebar-collapsed'

/** Shared collapse/expand persistence for the app and chat sidebars — same
 * localStorage key both always used, kept identical here so existing users'
 * collapse preference doesn't reset. */
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {}
  }, [collapsed])

  return [collapsed, setCollapsed] as const
}
