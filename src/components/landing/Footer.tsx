import Link from "next/link";
import Image from "next/image";
import { Github, Twitter } from "lucide-react";

const links = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Use Cases", href: "#features" },
    { label: "Docs", href: "/docs" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-zinc-200/60 bg-white/30 backdrop-blur-xl">
      <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/CortexLogo.png" alt="Cortex logo" width={20} height={20} className="object-contain" />
          <span className="text-[14px] font-semibold tracking-tight text-zinc-950">Cortex</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-5">
          {links.product.map((link) => (
            <Link key={link.label} href={link.href} className="text-[12.5px] text-zinc-500 hover:text-zinc-950 transition-colors">
              {link.label}
            </Link>
          ))}
          {links.legal.map((link) => (
            <Link key={link.label} href={link.href} className="text-[12.5px] text-zinc-500 hover:text-zinc-950 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <a href="https://github.com/Sudarshan-812" target="_blank" rel="noopener noreferrer" aria-label="GitHub"
            className="text-zinc-400 hover:text-zinc-950 transition-colors">
            <Github className="size-4" />
          </a>
          <a href="https://x.com/Sudarshan_dev8" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X"
            className="text-zinc-400 hover:text-zinc-950 transition-colors">
            <Twitter className="size-4" />
          </a>
          <span className="text-[12px] text-zinc-400 pl-1">
            &copy; {new Date().getFullYear()} Cortex
          </span>
        </div>

      </div>
    </footer>
  );
}
