'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const ease = [0.16, 1, 0.3, 1] as const

export default function AsciiHero() {
  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1.0)  translate(0%,    0%);   }
          33%  { transform: scale(1.07) translate(-0.8%, 0.4%); }
          66%  { transform: scale(1.04) translate(0.5%,  -0.6%);}
          100% { transform: scale(1.0)  translate(0%,    0%);   }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.72; }
          50%       { opacity: 0.85; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0px 0px rgba(34,211,238,0); }
          50%       { box-shadow: 0 0 18px 2px rgba(34,211,238,0.25); }
        }
        @keyframes linePulse {
          0%, 100% { opacity: 0.6; width: 56px; }
          50%       { opacity: 1;   width: 72px; }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0px);   }
          50%       { transform: translateY(-5px);  }
        }
        @keyframes scrollDrop {
          0%        { opacity: 0; transform: translateY(0px);  }
          40%, 60%  { opacity: 1; }
          100%      { opacity: 0; transform: translateY(22px); }
        }
      `}</style>

      {/* Background landscape with Ken Burns */}
      <div
        style={{
          position: 'absolute',
          top: '-4%',
          left: '-4%',
          width: '108%',
          height: '108%',
          backgroundImage: 'url(/landscape.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          animation: 'kenburns 28s ease-in-out infinite, breathe 8s ease-in-out infinite',
          zIndex: 1,
        }}
      />

      {/* Top gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '52%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '32%',
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.92))',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse 110% 95% at 50% 50%, transparent 48%, rgba(0,0,0,0.55) 100%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '64px',
          padding: '0 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20,
        }}
      >
        <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 'bold', fontSize: '17px', color: '#22D3EE', letterSpacing: '4px' }}>
          CORTEX
        </span>

        <div style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          {(['Features', 'Docs', 'Pricing'] as const).map((label) => (
            <a
              key={label}
              href={label === 'Docs' ? '/docs' : `#${label.toLowerCase()}`}
              style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', textDecoration: 'none', fontFamily: '"Courier New", monospace' }}
            >
              {label}
            </a>
          ))}
        </div>

        <Link
          href="/login"
          style={{
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(0,0,0,0.3)',
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            letterSpacing: '2px',
            padding: '8px 18px',
            textDecoration: 'none',
            display: 'inline-block',
            backdropFilter: 'blur(8px)',
          }}
        >
          SIGN IN
        </Link>
      </motion.nav>

      {/* Hero content */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 24px',
          marginTop: '-60px',
        }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease }}
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '9px',
            letterSpacing: '5px',
            color: '#22D3EE',
            border: '1px solid rgba(34,211,238,0.35)',
            padding: '6px 18px',
            marginBottom: '28px',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(10px)',
            animation: 'glowPulse 4s ease-in-out infinite',
          }}
        >
          DOCUMENT INTELLIGENCE PLATFORM
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.7, ease }}
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: 'clamp(52px, 8vw, 92px)',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '18px',
            margin: '0 0 14px 0',
            textShadow: '0 2px 40px rgba(0,0,0,0.7), 0 0 80px rgba(34,211,238,0.18)',
            lineHeight: 1,
          }}
        >
          CORTEX
        </motion.h1>

        {/* Animated cyan line */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.42, duration: 0.6, ease }}
          style={{
            height: '1px',
            background: 'linear-gradient(to right, transparent, #22D3EE, transparent)',
            margin: '0 auto 22px',
            animation: 'linePulse 5s ease-in-out infinite',
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.55, ease }}
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.38)',
            letterSpacing: '5px',
            marginBottom: '28px',
          }}
        >
          RAG · RETRIEVAL · REASONING
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.55, ease }}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '15px',
            color: 'rgba(255,255,255,0.5)',
            maxWidth: '360px',
            lineHeight: '1.8',
            marginBottom: '40px',
          }}
        >
          Upload documents. Ask anything.{' '}
          Every answer grounded in your data.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.55, ease }}
          style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '52px' }}
        >
          <Link
            href="/login"
            style={{
              background: '#22D3EE',
              color: '#000',
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '3px',
              padding: '13px 36px',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#67e8f9'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#22D3EE'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            GET STARTED →
          </Link>
          <a
            href="#features"
            style={{
              background: 'rgba(0,0,0,0.25)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.14)',
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              letterSpacing: '3px',
              padding: '13px 36px',
              textDecoration: 'none',
              display: 'inline-block',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.2s, color 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            VIEW DOCS
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.88, duration: 0.7 }}
          style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {['5 Projects', 'RAG + Hybrid Search', 'Zero Hallucinations'].map((stat, i, arr) => (
            <span key={stat} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '2px' }}>
                {stat}
              </span>
              {i < arr.length - 1 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>·</span>}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '3px' }}>
          SCROLL
        </span>
        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '40%',
            background: 'rgba(34,211,238,0.7)',
            animation: 'scrollDrop 2s ease-in-out infinite',
          }} />
        </div>
      </motion.div>
    </section>
  )
}
