import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/AppSidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const avatarUrl = user.user_metadata?.avatar_url || undefined
  const userName  = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"
  const userEmail = user.email ?? ""

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })

  const cookieStore = await cookies()
  const activeId = cookieStore.get("cortex_active_workspace")?.value
  const workspace = workspaces?.find(w => w.id === activeId) ?? workspaces?.[0] ?? null

  // No workspace yet - the dashboard page renders its own centered onboarding
  // card, so skip the app shell entirely rather than showing an empty sidebar.
  if (!workspace || !workspaces || workspaces.length === 0) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--cx-paper)", color: "var(--cx-ink)" }}>
      <AppSidebar
        workspace={workspace}
        workspaces={workspaces}
        user={{ name: userName, email: userEmail, avatarUrl }}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
