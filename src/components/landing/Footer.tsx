"use client";

import Link from "next/link";
import Image from "next/image";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Docs", href: "/docs" },
  // TODO: point at a real support/contact address before launch.
  { label: "Contact", href: "mailto:hello@cortex.app" },
];

export function Footer() {
  return (
    <footer
      className="lp-font relative z-10 border-t mt-20"
      style={{ borderColor: "var(--lp-border)", background: "var(--lp-bg)" }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-70 transition-opacity">
          <Image src="/CortexLogo.png" alt="Cortex logo" width={18} height={18} className="object-contain" style={{ width: "18px", height: "18px" }} />
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--lp-ink)" }}>Cortex</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LINKS.map(l => (
            <Link
              key={l.label}
              href={l.href}
              className="text-[12.5px] transition-opacity hover:opacity-60"
              style={{ color: "var(--lp-mute-1)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-[12px] cx-num" style={{ color: "var(--lp-mute-2)" }}>
            &copy; {new Date().getFullYear()} Cortex
          </span>
        </div>
      </div>
    </footer>
  );
}
