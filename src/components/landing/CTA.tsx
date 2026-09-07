"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MagneticButton } from "@/components/MagneticButton";

const ease = [0.16, 1, 0.3, 1] as const;

interface CTAProps {
  isLoggedIn?: boolean;
}

export function CTA({ isLoggedIn = false }: CTAProps) {
  return (
    <section className="lp-font relative z-10 max-w-[1200px] mx-auto px-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.4, ease }}
        className="lp-panel relative overflow-hidden rounded-[2rem] px-10 py-16 text-center"
      >
        {/* Soft inner highlight */}
        <div className="absolute inset-0 pointer-events-none rounded-[2rem]"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(161,98,7,0.08), transparent)' }} />

        <div className="relative z-10 flex flex-col items-center gap-5">
          <h2
            className="lp-display text-4xl md:text-[3.2rem] font-medium tracking-tight leading-[1.08] max-w-lg"
            style={{ color: 'var(--lp-ink)' }}>
            Your Drive already has the answers. <span className="lp-gradient-text">Start asking.</span>
          </h2>

          <p className="text-[15px] max-w-sm leading-relaxed" style={{ color: 'var(--lp-mute-1)' }}>
            Connect Google Drive and ask your first question in under a minute. Cortex handles the rest.
          </p>

          <div className="mt-2">
            <MagneticButton>
              <Link
                href={isLoggedIn ? "/" : "/login"}
                className="lp-btn-accent group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-[15px]"
              >
                {isLoggedIn ? "Open Cortex" : "Connect Google Drive"}
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </MagneticButton>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
