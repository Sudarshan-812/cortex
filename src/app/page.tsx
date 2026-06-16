import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { LandingBackground } from "@/components/landing/LandingBackground";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }

  const supabase = await createClient();
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // stale refresh token — treat as logged out
  }

  const isLoggedIn = !!user;
  const avatarUrl = user?.user_metadata?.avatar_url || undefined;
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <>
      {/* Outside the stacking context so fixed bg + backdrop-filter work correctly */}
      <LandingBackground />
      <div className="relative min-h-screen font-sans pb-14" style={{ color: 'var(--cx-ink)' }}>
        <Navbar isLoggedIn={isLoggedIn} avatarUrl={avatarUrl} userName={userName} />
        <Hero isLoggedIn={isLoggedIn} />
        <Features />
        <CTA isLoggedIn={isLoggedIn} />
        <Footer />
      </div>
    </>
  );
}
