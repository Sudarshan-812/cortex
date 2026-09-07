import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Architecture } from "@/components/landing/Architecture";
import { Features } from "@/components/landing/Features";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { LandingBackground } from "@/components/landing/LandingBackground";

import { AppShell } from "@/components/app-shell";
import { HomeView } from "@/components/home/HomeView";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }

  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // stale refresh token - treat as logged out
  }

  /* ── Logged out: marketing landing ─────────────────────────────── */
  if (!user) {
    return (
      <>
        {/* Outside the stacking context so fixed bg + backdrop-filter work correctly */}
        <LandingBackground />
        <div className="relative min-h-screen lp-font" style={{ color: "var(--lp-ink)" }}>
          <Navbar isLoggedIn={false} />
          <Hero isLoggedIn={false} />
          <Architecture />
          <Features />
          <CTA isLoggedIn={false} />
          <Footer />
        </div>
      </>
    );
  }

  /* ── Logged in: resolve workspace ─────────────────────────────── */
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const cookieStore = await cookies();
  const activeId = cookieStore.get("cortex_active_workspace")?.value;
  const workspace = workspaces?.find(w => w.id === activeId) ?? workspaces?.[0] ?? null;

  /* ── No workspace yet: onboarding card (no shell) ─────────────── */
  if (!workspace || !workspaces || workspaces.length === 0) {
    async function initWorkspace(formData: FormData) {
      "use server";
      const name = formData.get("workspaceName") as string;
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: newWorkspace, error } = await supabase
        .from("workspaces").insert({ name, owner_id: user.id }).select().single();
      if (error) return;
      await supabase.from("workspace_members").insert({
        workspace_id: newWorkspace.id, user_id: user.id, role: "admin",
      });
      const cookieStore = await cookies();
      cookieStore.set("cortex_active_workspace", newWorkspace.id, {
        maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax",
      });
      redirect("/");
    }
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--cx-paper)" }}>
        <div className="w-full max-w-sm px-4">
          <div className="cx-panel p-6">
            <div className="mb-5">
              <Image src="/CortexLogo.png" alt="Cortex" width={28} height={28} className="object-contain" />
            </div>
            <h1 className="text-[17px] font-semibold tracking-tight mb-1" style={{ color: "var(--cx-ink)" }}>
              Create your workspace
            </h1>
            <p className="text-[13px] mb-5" style={{ color: "var(--cx-mute-1)" }}>
              Give it a name and you&apos;re ready to add documents.
            </p>
            <form action={initWorkspace} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="workspaceName" className="text-[12.5px] font-medium" style={{ color: "var(--cx-ink-2)" }}>
                  Workspace name
                </label>
                <input
                  name="workspaceName" id="workspaceName" placeholder="e.g. Acme Legal Docs" required
                  className="w-full h-9 rounded-md border px-3 text-[13px] outline-none transition-colors focus:border-[var(--cx-line-2)]"
                  style={{ borderColor: "var(--cx-line)", background: "var(--cx-surface)", color: "var(--cx-ink)" }}
                />
              </div>
              <button type="submit" className="cx-btn-ink w-full h-9 rounded-md font-medium text-[13px]">
                Create workspace
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── Home surface ────────────────────────────────────────────── */
  const { data: documents, count: docCount } = await supabase
    .from("documents")
    .select(
      "id, name, size_bytes, created_at, summary, topics, source_type, external_id, last_synced_at",
      { count: "exact" }
    )
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  const { data: recentSessions } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })
    .limit(6);

  const { data: driveConn } = await supabase
    .from("connector_accounts")
    .select("id")
    .eq("provider", "gdrive")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  const totalBytes = documents?.reduce((s, d) => s + (d.size_bytes ?? 0), 0) ?? 0;
  const storageMB = Math.round(totalBytes / (1024 * 1024));

  return (
    <AppShell>
      <HomeView
        workspace={{ id: workspace.id, name: workspace.name }}
        documents={documents ?? []}
        docCount={docCount ?? 0}
        recentSessions={recentSessions ?? []}
        storageMB={storageMB}
        driveConnected={!!driveConn}
      />
    </AppShell>
  );
}
