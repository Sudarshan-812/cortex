"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface CTAProps {
  isLoggedIn?: boolean;
}

export function CTA({ isLoggedIn = false }: CTAProps) {
  return (
    <section className="relative z-10 max-w-[1200px] mx-auto px-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[2rem] bg-zinc-950 px-10 py-14 text-center"
      >
        {/* Subtle fuchsia glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(192,38,211,0.18),transparent)] pointer-events-none" />

        {/* Dashed orbit ring */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-white/5 border-dashed pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-fuchsia-400" />
            <span className="text-[12px] font-bold tracking-widest text-white/70 uppercase">Free to get started</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.1] max-w-xl">
            Your knowledge base is one upload away.
          </h2>

          <p className="text-[16px] text-zinc-400 max-w-md leading-relaxed">
            Drop in your PDFs and start asking questions in seconds. No setup, no config — just answers.
          </p>

          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="group relative overflow-hidden inline-flex items-center gap-2 bg-white text-zinc-950 px-8 py-3.5 rounded-full font-bold text-[15px] hover:bg-zinc-100 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 mt-2"
          >
            <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-black/5 to-transparent skew-x-[-15deg]" />
            {isLoggedIn ? "Go to Dashboard" : "Start for Free"}
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
