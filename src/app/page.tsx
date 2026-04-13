import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { AuroraBackground } from "@/components/AuroraBackground";

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
  const { data: { user } } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const avatarUrl = user?.user_metadata?.avatar_url || undefined;
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 overflow-hidden font-sans relative selection:bg-fuchsia-200">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AuroraBackground
          speed={0.5}
          scale={1.4}
          brightness={0.9}
          color1="#f0f0f0"
          color2="#c026d3"
          noiseFrequency={2.2}
          noiseAmplitude={0.8}
          bandHeight={0.6}
          bandSpread={1.1}
          octaveDecay={0.15}
          layerOffset={0.2}
          colorSpeed={0.8}
        />
      </div>

      <Navbar isLoggedIn={isLoggedIn} avatarUrl={avatarUrl} userName={userName} />
      <Hero isLoggedIn={isLoggedIn} />
      <Features />
      <CTA isLoggedIn={isLoggedIn} />
      <Footer />
    </div>
  );
}
