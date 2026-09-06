"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, LogOut, LayoutDashboard, Settings, Menu, X,
} from "lucide-react";

type DropdownKey = "avatar" | null;

interface NavbarProps {
  isLoggedIn?: boolean;
  avatarUrl?: string;
  userName?: string;
}

const dropPop = {
  initial:    { opacity: 0, scale: 0.96, y: -6 },
  animate:    { opacity: 1, scale: 1,    y:  0 },
  exit:       { opacity: 0, scale: 0.96, y: -6 },
  transition: { type: 'spring' as const, stiffness: 340, damping: 26 },
};

export function Navbar({ isLoggedIn = false, avatarUrl, userName = "User" }: NavbarProps) {
  const [open,       setOpen]       = useState<DropdownKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  const navRef    = useRef<HTMLElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const router    = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (!navRef.current?.contains(t) && !avatarRef.current?.contains(t)) setOpen(null);
      else if (!navRef.current?.contains(t) && open !== "avatar") setOpen(null);
      else if (!avatarRef.current?.contains(t) && open === "avatar") setOpen(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(null); setMobileOpen(false); }
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

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const toggle = (key: DropdownKey) => setOpen(prev => prev === key ? null : key);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(null); setMobileOpen(false);
    router.refresh();
  };

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const linkHover = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.opacity = '0.6'),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.opacity = '1'),
  };

  const rowHover = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = 'var(--lp-surface-2)'),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = ''),
  };

  const AvatarBubble = ({ size = 28 }: { size?: number }) => (
    <div
      className="rounded-full overflow-hidden border flex-shrink-0 flex items-center justify-center font-bold"
      style={{
        width: size, height: size,
        borderColor: 'var(--lp-border)',
        background: 'var(--lp-primary-wash)',
        color: 'var(--lp-primary)',
        fontSize: size < 30 ? '11px' : '12px',
      }}
    >
      {avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        : initials}
    </div>
  );

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background:    scrolled ? 'rgba(250,250,249,0.78)'         : 'transparent',
          borderBottom:  scrolled ? '1px solid var(--lp-border)'     : '1px solid transparent',
          backdropFilter:scrolled ? 'blur(24px) saturate(140%)'     : 'none',
          boxShadow:     scrolled ? '0 1px 24px rgba(28,25,23,0.06)' : 'none',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <Image src="/CortexLogo.png" alt="Cortex logo" width={26} height={26} className="object-contain" style={{ width: '26px', height: '26px' }} />
              <span className="lp-display text-[17px] font-semibold tracking-tight" style={{ color: 'var(--lp-ink)' }}>Cortex</span>
            </Link>
          </motion.div>

          {/* Desktop nav */}
          <nav ref={navRef} className="hidden md:flex items-center gap-0.5 relative">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Architecture', href: '#architecture' },
              { label: 'Docs', href: '/docs' },
            ].map(l => (
              <Link key={l.label} href={l.href}
                className="px-3.5 py-2 text-[13.5px] font-medium rounded-xl transition-colors outline-none"
                style={{ color: 'var(--lp-ink)' }} {...linkHover}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLoggedIn ? (
              <div className="relative" ref={avatarRef}>
                <button onClick={() => toggle("avatar")}
                  className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full transition-colors outline-none"
                  {...rowHover}>
                  <AvatarBubble size={28} />
                  <motion.span animate={{ rotate: open === "avatar" ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex">
                    <ChevronDown size={13} style={{ color: 'var(--lp-ink)' }} />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {open === "avatar" && (
                    <motion.div {...dropPop} role="menu"
                      className="absolute top-[calc(100%+8px)] right-0 w-[220px] border rounded-2xl p-1.5 z-50"
                      style={{ transformOrigin: 'top right', background: 'var(--lp-surface)', borderColor: 'var(--lp-border)', boxShadow: '0 20px 60px rgba(28,25,23,0.14)' }}>
                      <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
                        <AvatarBubble size={32} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--lp-ink)' }}>{userName}</p>
                          <p className="text-[11px]" style={{ color: 'var(--lp-mute-2)' }}>Personal workspace</p>
                        </div>
                      </div>
                      <div className="border-t my-1" style={{ borderColor: 'var(--lp-border)' }} />
                      <Link href="/dashboard" role="menuitem" onClick={() => setOpen(null)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-[13px] font-medium outline-none"
                        style={{ color: 'var(--lp-ink-2)' }} {...rowHover}>
                        <LayoutDashboard size={14} style={{ color: 'var(--lp-mute-2)' }} /> Dashboard
                      </Link>
                      <Link href="/dashboard/settings" role="menuitem" onClick={() => setOpen(null)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-[13px] font-medium outline-none"
                        style={{ color: 'var(--lp-ink-2)' }} {...rowHover}>
                        <Settings size={14} style={{ color: 'var(--lp-mute-2)' }} /> Settings
                      </Link>
                      <div className="border-t my-1" style={{ borderColor: 'var(--lp-border)' }} />
                      <button role="menuitem" onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-[13px] font-medium text-left outline-none"
                        style={{ color: 'var(--lp-mute-1)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = 'var(--lp-err)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--lp-mute-1)'; }}>
                        <LogOut size={14} /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link href="/login"
                  className="hidden sm:block px-3.5 py-2 text-[13px] font-medium rounded-xl transition-colors outline-none"
                  style={{ color: 'var(--lp-ink)' }} {...linkHover}>
                  Log in
                </Link>
                <motion.div whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 420, damping: 20 }}>
                  <Link href="/login" className="h-8 px-4 inline-flex items-center justify-center rounded-full text-[13px] font-semibold lp-btn-primary">
                    Get Started
                  </Link>
                </motion.div>
              </>
            )}

            <button onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-xl transition-opacity ml-1 outline-none"
              style={{ color: 'var(--lp-ink)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y:  0 }}
            exit={{    opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden border-b"
            style={{ background: 'var(--lp-surface)', borderColor: 'var(--lp-border)' }}>
            <nav className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col gap-0.5">
              {[
                { label: "Features", href: "#features" },
                { label: "Architecture", href: "#architecture" },
                { label: "Docs", href: "/docs" },
              ].map(({ label, href }) => (
                <Link key={label} href={href} onClick={() => setMobileOpen(false)}
                  className="flex items-center px-3 py-3 text-[14px] font-medium rounded-xl transition-colors"
                  style={{ color: 'var(--lp-ink-2)' }} {...rowHover}>{label}</Link>
              ))}

              <div className="border-t my-2" style={{ borderColor: 'var(--lp-border)' }} />

              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium rounded-xl transition-colors"
                    style={{ color: 'var(--lp-ink-2)' }} {...rowHover}>
                    <LayoutDashboard size={15} style={{ color: 'var(--lp-mute-2)' }} /> Dashboard
                  </Link>
                  <button onClick={handleSignOut}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium rounded-xl transition-colors w-full text-left outline-none"
                    style={{ color: 'var(--lp-err)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <LogOut size={15} /> Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link href="/login" onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-center text-[14px] font-medium rounded-xl transition-colors"
                    style={{ color: 'var(--lp-ink-2)' }} {...rowHover}>
                    Log in
                  </Link>
                  <Link href="/login" onClick={() => setMobileOpen(false)}
                    className="py-2.5 text-center rounded-xl text-[14px] font-semibold lp-btn-primary">
                    Get Started
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
