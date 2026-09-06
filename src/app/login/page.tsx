"use client";

import React, { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Mail, Lock, ArrowRight, Eye, EyeOff,
  AlertCircle, CheckCircle2,
} from 'lucide-react';

import SoftAurora from "@/components/SoftAurora";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleEmailAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setSuccessMsg("Check your email for the confirmation link to complete setup.");
          setEmail('');
          setPassword('');
        } else {
          router.push('/dashboard');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, isSignUp, router, supabase]);

  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setError("Google login failed. Please try again.");
      setIsLoading(false);
    }
  }, [supabase]);

  return (
    <div className="grid h-screen w-screen overflow-hidden lg:grid-cols-2" style={{ background: 'var(--cx-paper)' }}>
      <div className="relative hidden h-full flex-col border-r p-10 lg:flex overflow-hidden" style={{ background: 'var(--cx-paper-2)', borderColor: 'var(--cx-line)' }}>
        <div className="absolute inset-0 z-0">
          <SoftAurora
            speed={0.45}
            scale={1.25}
            brightness={0.85}
            color1="#f8fafc"
            color2="#c026d3"
            noiseFrequency={2.1}
            noiseAmplitude={0.75}
            bandHeight={0.55}
            bandSpread={1.15}
            octaveDecay={0.18}
            layerOffset={0.12}
            colorSpeed={0.6}
            enableMouseInteraction
            mouseInfluence={0.2}
          />
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between mb-20"
          >
            <div className="flex items-center gap-3">
              <Image src="/CortexLogo.png" alt="Cortex Logo" width={32} height={32} className="object-contain" />
              <span className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--cx-ink)' }}>Cortex</span>
            </div>
            <span className="cx-num text-[10.5px]" style={{ color: 'var(--cx-mute-2)' }}>v2.0 · Active</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-center max-w-[480px]"
          >
            <h1 className="text-5xl font-semibold tracking-[-0.025em] leading-[1.05] mb-5" style={{ color: 'var(--cx-ink)' }}>
              Your documents.<br />
              <span style={{ color: 'var(--cx-mute-1)' }}>Finally intelligent.</span>
            </h1>
            <p className="text-[16px] leading-relaxed" style={{ color: 'var(--cx-mute-1)' }}>
              Secure enterprise RAG platform with hybrid search, AI re-ranking, and real-time conversational memory.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="cx-num text-[10.5px] flex items-center justify-between mt-auto"
            style={{ color: 'var(--cx-mute-2)' }}
          >
            <div>pgvector · Gemini · Supabase</div>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full cx-pulse-dot" style={{ background: 'var(--cx-ok)' }} />
              <span style={{ color: 'var(--cx-ok)' }}>Production Ready</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative flex h-full items-center justify-center p-6 sm:p-12" style={{ background: 'var(--cx-paper)' }}>
        <Link
          href="/"
          className="absolute top-8 right-8 text-[13px] font-semibold transition-colors"
          style={{ color: 'var(--cx-mute-2)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-mute-2)')}
        >
          ← Back to site
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image src="/CortexLogo.png" alt="Cortex Logo" width={48} height={48} className="object-contain mx-auto mb-6" />
            </motion.div>
            <h2 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: 'var(--cx-ink)' }}>
              {isSignUp ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="text-[14px]" style={{ color: 'var(--cx-mute-1)' }}>
              {isSignUp
                ? "Enter your details to initialize your knowledge base."
                : "Sign in to access your documents and chats."}
            </p>
          </div>

          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-2xl border font-semibold text-[14px] transition-all mb-5 cx-panel"
            style={{ color: 'var(--cx-ink-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--cx-surface)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <svg className="size-4.5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
              <path d="M12 4.66c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </motion.button>

          <div className="relative flex items-center mb-5">
            <div className="flex-grow border-t" style={{ borderColor: 'var(--cx-line)' }} />
            <span className="mx-4 text-[10.5px] uppercase tracking-widest font-semibold" style={{ color: 'var(--cx-mute-2)' }}>or email</span>
            <div className="flex-grow border-t" style={{ borderColor: 'var(--cx-line)' }} />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: 'var(--cx-ink)' }}>Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 pointer-events-none" size={16} style={{ color: 'var(--cx-mute-2)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border text-[14px] font-medium outline-none transition-all"
                  style={{
                    background: 'var(--cx-surface)',
                    borderColor: 'var(--cx-line)',
                    color: 'var(--cx-ink)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--cx-accent-line)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--cx-accent-wash)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--cx-line)'; e.currentTarget.style.boxShadow = ''; }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12.5px] font-semibold" style={{ color: 'var(--cx-ink)' }}>Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) { setError("Enter your email above first."); return; }
                      setIsLoading(true); setError(null);
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                      });
                      setIsLoading(false);
                      if (error) setError(error.message);
                      else setSuccessMsg("Password reset email sent - check your inbox.");
                    }}
                    className="text-[12px] font-semibold transition-colors"
                    style={{ color: 'var(--cx-mute-1)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-mute-1)')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 pointer-events-none" size={16} style={{ color: 'var(--cx-mute-2)' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-11 rounded-xl border text-[14px] font-medium outline-none transition-all"
                  style={{
                    background: 'var(--cx-surface)',
                    borderColor: 'var(--cx-line)',
                    color: 'var(--cx-ink)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--cx-accent-line)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--cx-accent-wash)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--cx-line)'; e.currentTarget.style.boxShadow = ''; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 transition-colors"
                  style={{ color: 'var(--cx-mute-2)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-mute-2)')}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 border p-3.5 rounded-xl mt-1" style={{ background: 'rgba(166,68,58,0.05)', borderColor: 'rgba(166,68,58,0.2)', color: 'var(--cx-err)' }}>
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <p className="text-[13px] font-medium leading-snug">{error}</p>
                  </div>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 border p-3.5 rounded-xl mt-1" style={{ background: 'var(--cx-ok-wash)', borderColor: 'rgba(60,110,71,0.2)', color: 'var(--cx-ok)' }}>
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    <p className="text-[13px] font-medium leading-snug">{successMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.985 }}
              className="group w-full h-12 mt-2 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cx-btn-ink disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? "Create Workspace" : "Sign in to Cortex"}</span>
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[13px] mt-7" style={{ color: 'var(--cx-mute-1)' }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
                setPassword('');
              }}
              className="font-semibold transition-colors"
              style={{ color: 'var(--cx-ink)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--cx-accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--cx-ink)')}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
