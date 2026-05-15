"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Twitter } from "lucide-react";

export function Footer() {
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total    = document.documentElement.scrollHeight;
      setAtBottom(scrolled >= total - 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <footer
      className="fixed bottom-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background:           atBottom ? 'transparent'                  : 'rgba(246,245,242,0.9)',
        borderTop:            atBottom ? '1px solid transparent'        : '1px solid var(--cx-line)',
        backdropFilter:       atBottom ? 'none'                         : 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: atBottom ? 'none'                         : 'blur(20px) saturate(180%)',
        boxShadow:            atBottom ? 'none'                         : '0 -1px 24px rgba(0,0,0,0.055)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between gap-6">

        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/CortexLogo.png" alt="Cortex logo" width={18} height={18} className="object-contain" style={{ width: '18px', height: '18px' }} />
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>Cortex</span>
        </Link>

        <span className="text-[12px] cx-num" style={{ color: 'var(--cx-mute-2)' }}>
          &copy; {new Date().getFullYear()} Cortex
        </span>

        <div className="flex items-center gap-3 flex-shrink-0">
          <a href="https://github.com/Sudarshan-812" target="_blank" rel="noopener noreferrer" aria-label="GitHub"
            className="transition-colors" style={{ color: 'var(--cx-mute-2)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-mute-2)')}>
            <Github className="size-4" />
          </a>
          <a href="https://x.com/Sudarshan_dev8" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X"
            className="transition-colors" style={{ color: 'var(--cx-mute-2)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-mute-2)')}>
            <Twitter className="size-4" />
          </a>
        </div>

      </div>
    </footer>
  );
}
