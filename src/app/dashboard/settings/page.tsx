import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsContent } from "@/components/dashboard/SettingsContent";
import { GoogleDriveCard } from "@/components/dashboard/GoogleDriveCard";
import { EditableSetting } from "@/components/dashboard/EditableSetting";
import { renameWorkspace, updateDisplayName } from "@/app/actions";

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
      iconName: "User",
      title: "Profile",
      description: "Your account identity.",
      items: [
        { label: "Email",          value: user.email ?? "—" },
        { label: "Auth provider",  value: user.app_metadata?.provider === "google" ? "Google OAuth" : "Email / Password" },
      ],
    },
    {
      iconName: "Building2",
      title: "Workspace",
      description: "Details about your workspace.",
      items: [
        { label: "Workspace ID",   value: workspace?.id ? workspace.id.slice(0, 8) + "…" : "—" },
        { label: "Created",        value: workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : "—" },
      ],
    },
    {
      iconName: "Shield",
      title: "Security",
      description: "Session and authentication settings.",
      items: [
        { label: "Last sign in",     value: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—" },
        { label: "Account created",  value: user.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
        { label: "User ID",          value: (user.id?.slice(0, 8) ?? "") + "…" },
      ],
    },
  ];

  return (
    <SettingsContent
      userName={userName}
      email={user.email ?? ""}
      avatarUrl={avatarUrl}
      sections={sections}
      extra={
        <>
          <EditableSetting label="Display name" value={userName} onSave={updateDisplayName} />
          {workspace && (
            <EditableSetting
              label="Workspace name"
              value={workspace.name}
              onSave={renameWorkspace.bind(null, workspace.id)}
            />
          )}
          <GoogleDriveCard workspaceId={workspace?.id} />
        </>
      }
    />
  );
}
