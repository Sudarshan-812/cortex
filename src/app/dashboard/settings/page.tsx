import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/landing/Navbar";
import { ArrowLeft, User, Shield, Trash2, Building2 } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const avatarUrl = user.user_metadata?.avatar_url || undefined;
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const sections = [
    {
      icon: User,
      title: "Profile",
      description: "Your account identity and display name.",
      items: [
        { label: "Display name", value: userName },
        { label: "Email", value: user.email ?? "—" },
        { label: "Auth provider", value: user.app_metadata?.provider === "google" ? "Google OAuth" : "Email / Password" },
      ],
    },
    {
      icon: Building2,
      title: "Workspace",
      description: "Details about your knowledge base workspace.",
      items: [
        { label: "Workspace name", value: workspace?.name ?? "—" },
        { label: "Workspace ID", value: workspace?.id ? workspace.id.slice(0, 8) + "…" : "—" },
        { label: "Created", value: workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : "—" },
      ],
    },
    {
      icon: Shield,
      title: "Security",
      description: "Session and authentication settings.",
      items: [
        { label: "Last sign in", value: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—" },
        { label: "Account created", value: user.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
        { label: "User ID", value: user.id?.slice(0, 8) + "…" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 font-sans selection:bg-fuchsia-200">
      <Navbar isLoggedIn avatarUrl={avatarUrl} userName={userName} />

      <div className="fixed top-0 inset-x-0 h-[300px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_#fdf4ff_0%,_transparent_100%)] pointer-events-none z-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-28 pb-16">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-400 hover:text-zinc-950 transition-colors mb-5"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your account and workspace preferences.</p>
        </div>

        {/* Avatar card */}
        <div className="bg-white/60 backdrop-blur-xl border border-zinc-200/60 rounded-2xl p-6 mb-5 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=e4e4e7&color=18181b&size=64`}
              alt={`${userName} avatar`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <p className="text-[15px] font-bold text-zinc-950">{userName}</p>
            <p className="text-[13px] text-zinc-500 mt-0.5">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Active</span>
            </div>
          </div>
        </div>

        {/* Settings sections */}
        <div className="space-y-5">
          {sections.map(({ icon: Icon, title, description, items }) => (
            <div key={title} className="bg-white/60 backdrop-blur-xl border border-zinc-200/60 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-start gap-3">
                <div className="size-8 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="size-4 text-zinc-600" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-zinc-950">{title}</h2>
                  <p className="text-[12.5px] text-zinc-400 mt-0.5">{description}</p>
                </div>
              </div>
              <div className="divide-y divide-zinc-100">
                {items.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-6 py-3.5">
                    <span className="text-[13px] font-medium text-zinc-500">{label}</span>
                    <span className="text-[13px] font-semibold text-zinc-900 text-right max-w-[60%] truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Danger zone */}
          <div className="bg-white/60 backdrop-blur-xl border border-red-200/60 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 flex items-start gap-3">
              <div className="size-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="size-4 text-red-500" />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-zinc-950">Danger Zone</h2>
                <p className="text-[12.5px] text-zinc-400 mt-0.5">Irreversible account actions.</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-zinc-800">Sign out of all devices</p>
                <p className="text-[12px] text-zinc-400 mt-0.5">Revoke all active sessions immediately.</p>
              </div>
              <form action={async () => {
                "use server";
                const supabase = await createClient();
                await supabase.auth.signOut({ scope: "global" });
                redirect("/login");
              }}>
                <button
                  type="submit"
                  className="h-8 px-4 text-[12.5px] font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
                >
                  Sign out everywhere
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
