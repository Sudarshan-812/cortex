"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Database, FileSearch, BrainCircuit, Zap,
  ChevronDown, MessageSquare, ShieldCheck, Layers, LogOut,
  LayoutDashboard, Settings, Menu, X,
} from "lucide-react";

const featuresMenu = [
  { icon: Database, title: "Enterprise RAG Pipeline", description: "768-dim embeddings in pgvector via Supabase", href: "#features" },
  { icon: FileSearch, title: "Hybrid Search", description: "Vector cosine + BM25 keyword fusion", href: "#features" },
  { icon: BrainCircuit, title: "AI Re-ranking", description: "Gemini-powered relevance scoring on top chunks", href: "#features" },
  { icon: Zap, title: "Zero-Latency Streaming", description: "Server-Sent Events for instant token delivery", href: "#features" },
  { icon: MessageSquare, title: "Cited Answers", description: "Every response backed by exact source citations", href: "#features" },
  { icon: ShieldCheck, title: "Workspace Isolation", description: "Fully private, tenant-isolated document stores", href: "#features" },
];

const useCasesMenu = [
  { icon: Layers, title: "Research & Analysis", description: "Query large document libraries instantly", href: "#features" },
  { icon: ShieldCheck, title: "Legal & Compliance", description: "Find clauses and policies across contracts", href: "#features" },
  { icon: MessageSquare, title: "Internal Knowledge Base", description: "Turn company docs into a smart assistant", href: "#features" },
];

type DropdownKey = "features" | "usecases" | "avatar" | null;

interface NavbarProps {
  isLoggedIn?: boolean;
  avatarUrl?: string;
  userName?: string;
}

export function Navbar({ isLoggedIn = false, avatarUrl, userName = "User" }: NavbarProps) {
  const [open, setOpen] = useState<DropdownKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inNav = navRef.current?.contains(target);
      const inAvatar = avatarRef.current?.contains(target);
      if (!inNav && !inAvatar) setOpen(null);
      else if (!inNav && open !== "avatar") setOpen(null);
      else if (!inAvatar && open === "avatar") setOpen(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(null);
      setMobileOpen(false);
    }
  }, []);
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function toggle(key: DropdownKey) {
    setOpen(prev => (prev === key ? null : key));
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(null);
    setMobileOpen(false);
    router.refresh();
  };

  const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3.5 py-2 text-[13.5px] font-medium rounded-xl transition-all ${focusRing} ${
          isActive
            ? "text-zinc-950 bg-white/70 shadow-sm"
            : "text-zinc-500 hover:text-zinc-950 hover:bg-white/60"
        }`}
      >
        {children}
      </Link>
    );
  };

  const avatarSrc = avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=e4e4e7&color=18181b`;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl border-b border-zinc-200/60 shadow-[0_1px_20px_rgba(0,0,0,0.06)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">

          <Link href="/" className={`flex items-center gap-2.5 flex-shrink-0 rounded-xl ${focusRing}`}>
            <Image src="/CortexLogo.png" alt="Cortex logo" width={28} height={28} className="object-contain" />
            <span className="text-[17px] font-semibold tracking-tight text-zinc-950">Cortex</span>
          </Link>

          <nav ref={navRef} className="hidden md:flex items-center gap-0.5 relative">
            <NavLink href="#features">Product</NavLink>

            <div className="relative">
              <button
                onClick={() => toggle("features")}
                aria-haspopup="true"
                aria-expanded={open === "features"}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-medium rounded-xl transition-all ${focusRing} ${
                  open === "features"
                    ? "text-zinc-950 bg-white/70 backdrop-blur-sm shadow-sm"
                    : "text-zinc-500 hover:text-zinc-950 hover:bg-white/60"
                }`}
              >
                Features
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${open === "features" ? "rotate-180" : ""}`} />
              </button>

              {open === "features" && (
                <div
                  role="menu"
                  className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[380px] bg-white/90 backdrop-blur-2xl border border-zinc-200/60 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.12)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top"
                >
                  <div className="grid grid-cols-1 gap-0.5">
                    {featuresMenu.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setOpen(null)}
                          className={`flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group ${focusRing}`}
                        >
                          <div className="size-9 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-200 transition-colors">
                            <Icon className="size-4 text-zinc-700" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-zinc-900">{item.title}</p>
                            <p className="text-[12px] text-zinc-500 mt-0.5 leading-snug">{item.description}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="border-t border-zinc-100 mt-2 pt-2 px-1">
                    <Link
                      href="#features"
                      onClick={() => setOpen(null)}
                      className={`flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors rounded-lg ${focusRing}`}
                    >
                      View all features →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => toggle("usecases")}
                aria-haspopup="true"
                aria-expanded={open === "usecases"}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-medium rounded-xl transition-all ${focusRing} ${
                  open === "usecases"
                    ? "text-zinc-950 bg-white/70 backdrop-blur-sm shadow-sm"
                    : "text-zinc-500 hover:text-zinc-950 hover:bg-white/60"
                }`}
              >
                Use Cases
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${open === "usecases" ? "rotate-180" : ""}`} />
              </button>

              {open === "usecases" && (
                <div
                  role="menu"
                  className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[300px] bg-white/90 backdrop-blur-2xl border border-zinc-200/60 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.12)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top"
                >
                  {useCasesMenu.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpen(null)}
                        className={`flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group ${focusRing}`}
                      >
                        <div className="size-9 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-200 transition-colors">
                          <Icon className="size-4 text-zinc-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-zinc-900">{item.title}</p>
                          <p className="text-[12px] text-zinc-500 mt-0.5 leading-snug">{item.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                  <div className="border-t border-zinc-100 mt-2 pt-2 px-1">
                    <Link
                      href="#features"
                      onClick={() => setOpen(null)}
                      className={`flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors rounded-lg ${focusRing}`}
                    >
                      View all use cases →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <NavLink href="/docs">Docs</NavLink>
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isLoggedIn ? (
              <div className="relative" ref={avatarRef}>
                <button
                  onClick={() => toggle("avatar")}
                  aria-haspopup="true"
                  aria-expanded={open === "avatar"}
                  aria-label="Open user menu"
                  className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-zinc-100 transition-colors ${focusRing}`}
                >
                  <div className="h-7 w-7 rounded-full overflow-hidden border border-zinc-200 flex-shrink-0 bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarSrc}
                      alt={`${userName} avatar`}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <ChevronDown className={`size-3.5 text-zinc-400 transition-transform duration-200 ${open === "avatar" ? "rotate-180" : ""}`} />
                </button>

                {open === "avatar" && (
                  <div
                    role="menu"
                    className="absolute top-[calc(100%+8px)] right-0 w-[220px] bg-white/90 backdrop-blur-2xl border border-zinc-200/60 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.12)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                  >
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
                      <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-200 flex-shrink-0 bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarSrc}
                          alt={`${userName} avatar`}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-zinc-900 truncate">{userName}</p>
                        <p className="text-[11px] text-zinc-400">Personal workspace</p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 my-1" />

                    <Link
                      href="/dashboard"
                      role="menuitem"
                      onClick={() => setOpen(null)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors text-[13px] font-medium text-zinc-700 hover:text-zinc-950 ${focusRing}`}
                    >
                      <LayoutDashboard className="size-4 text-zinc-400" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      role="menuitem"
                      onClick={() => setOpen(null)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors text-[13px] font-medium text-zinc-700 hover:text-zinc-950 ${focusRing}`}
                    >
                      <Settings className="size-4 text-zinc-400" />
                      Settings
                    </Link>

                    <div className="border-t border-zinc-100 my-1" />

                    <button
                      role="menuitem"
                      onClick={handleSignOut}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-[13px] font-medium text-zinc-500 hover:text-red-600 ${focusRing}`}
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`hidden sm:block px-3.5 py-2 text-[13.5px] font-medium text-zinc-500 hover:text-zinc-950 hover:bg-white/60 rounded-xl transition-all ${focusRing}`}
                >
                  Log in
                </Link>
                <Link
                  href="/login"
                  className={`h-8 px-4 inline-flex items-center justify-center bg-zinc-950 text-white rounded-full text-[13.5px] font-medium hover:bg-zinc-800 transition-colors shadow-sm ${focusRing} focus-visible:ring-offset-0`}
                >
                  Get Started
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className={`md:hidden flex items-center justify-center h-8 w-8 rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-white/60 transition-all ml-1 ${focusRing}`}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-40 md:hidden bg-white/95 backdrop-blur-xl border-b border-zinc-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.08)] animate-in slide-in-from-top-2 duration-200">
          <nav className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col gap-1">
            <Link href="#features" onClick={() => setMobileOpen(false)} className={`flex items-center px-3 py-2.5 text-[14px] font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors ${focusRing}`}>
              Product
            </Link>

            <div className="px-3 pt-2 pb-1">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Features</p>
            </div>
            {featuresMenu.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2 text-[13.5px] font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors ${focusRing}`}>
                  <Icon className="size-4 text-zinc-400 flex-shrink-0" />
                  {item.title}
                </Link>
              );
            })}

            <div className="px-3 pt-3 pb-1">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Use Cases</p>
            </div>
            {useCasesMenu.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2 text-[13.5px] font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors ${focusRing}`}>
                  <Icon className="size-4 text-zinc-400 flex-shrink-0" />
                  {item.title}
                </Link>
              );
            })}

            <div className="border-t border-zinc-100 my-2" />

            <Link href="/docs" onClick={() => setMobileOpen(false)} className={`flex items-center px-3 py-2.5 text-[14px] font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors ${focusRing}`}>
              Docs
            </Link>

            <div className="border-t border-zinc-100 my-2" />

            {isLoggedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors ${focusRing}`}>
                  <LayoutDashboard className="size-4 text-zinc-400" /> Dashboard
                </Link>
                <button onClick={handleSignOut} className={`flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors w-full text-left ${focusRing}`}>
                  <LogOut className="size-4" /> Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link href="/login" onClick={() => setMobileOpen(false)} className={`px-3 py-2.5 text-center text-[14px] font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors ${focusRing}`}>
                  Log in
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)} className={`py-2.5 text-center bg-zinc-950 text-white rounded-xl text-[14px] font-medium hover:bg-zinc-800 transition-colors ${focusRing} focus-visible:ring-offset-0`}>
                  Get Started
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
