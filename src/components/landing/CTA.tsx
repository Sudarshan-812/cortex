"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MagneticButton } from "./MagneticButton";

const ease = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

interface CTAProps {
  isLoggedIn?: boolean;
}

export function CTA({ isLoggedIn = false }: CTAProps) {
  return (
    <section className="lp-font relative z-10 max-w-[1200px] mx-auto px-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.65, ease }}
        className="lp-panel relative overflow-hidden rounded-[2rem] px-10 py-16 text-center"
      >
        {/* Soft inner highlight */}
        <div className="absolute inset-0 pointer-events-none rounded-[2rem]"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(161,98,7,0.08), transparent)' }} />

        {/* Staggered content */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="relative z-10 flex flex-col items-center gap-5"
        >
          <motion.h2 variants={item}
            className="lp-display text-4xl md:text-[3.2rem] font-medium tracking-tight leading-[1.08] max-w-lg"
            style={{ color: 'var(--lp-ink)' }}>
            Your knowledge base is <span className="lp-gradient-text">one upload away.</span>
          </motion.h2>

          <motion.p variants={item}
            className="text-[15px] max-w-sm leading-relaxed"
            style={{ color: 'var(--lp-mute-1)' }}>
            Drop in your PDFs and start asking questions in seconds. No setup, no config — just answers.
          </motion.p>

          <motion.div variants={item} className="mt-2 flex flex-col sm:flex-row items-center gap-3">
            <MagneticButton>
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="lp-btn-accent group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-[15px]"
              >
                {isLoggedIn ? "Open Dashboard" : "Get Started — It's Free"}
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </MagneticButton>
            <span className="text-[12px]" style={{ color: 'var(--lp-mute-2)' }}>
              No setup · No config · Just upload and ask
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
