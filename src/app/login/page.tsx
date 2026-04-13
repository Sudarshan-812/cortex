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
    <div className="grid h-screen w-screen overflow-hidden bg-white lg:grid-cols-2 selection:bg-fuchsia-200">
      <div className="relative hidden h-full flex-col border-r border-zinc-200/80 bg-zinc-50 p-10 lg:flex overflow-hidden">
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
          <div className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-4">
              <Image src="/CortexLogo.png" alt="Cortex Logo" width={40} height={40} className="object-contain" />
              <span className="text-2xl font-extrabold tracking-tighter text-zinc-950">Cortex</span>
            </div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold">
              v2.0 // Active
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-[480px]">
            <h1 className="text-6xl font-bold tracking-[-0.03em] leading-[1.02] text-zinc-950 mb-6">
              Your documents.<br />
              <span className="text-zinc-500">Finally intelligent.</span>
            </h1>
            <p className="text-zinc-600 text-lg md:text-xl leading-relaxed font-medium">
              Secure enterprise RAG platform with hybrid search, AI re-ranking, and real-time conversational memory.
            </p>
          </div>

          <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between font-bold uppercase tracking-wider mt-auto">
            <div>pgvector • Gemini • Supabase</div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-zinc-700">Production Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex h-full items-center justify-center p-6 sm:p-12 bg-white">
        <Link href="/" className="absolute top-8 right-8 text-sm font-semibold text-zinc-400 hover:text-zinc-900 transition-colors">
          ← Back to site
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-10">
            <Image src="/CortexLogo.png" alt="Cortex Logo" width={48} height={48} className="object-contain mx-auto mb-6" />
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 mb-3">
              {isSignUp ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="text-[15px] font-medium text-zinc-500">
              {isSignUp
                ? "Enter your details to initialize your knowledge base."
                : "Sign in to access your documents and chats."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl border border-zinc-200/80 bg-white hover:bg-zinc-50 font-bold text-[15px] text-zinc-700 transition-all active:scale-[0.98] shadow-sm mb-6"
          >
            <svg className="size-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
              <path d="M12 4.66c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-zinc-100"></div>
            <span className="mx-4 text-[11px] uppercase tracking-widest text-zinc-400 font-bold">Or continue with email</span>
            <div className="flex-grow border-t border-zinc-100"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div>
              <label className="text-[13px] font-bold text-zinc-950 mb-2 block">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-zinc-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white text-[15px] text-zinc-900 font-medium placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-bold text-zinc-950">Password</label>
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
                      else setSuccessMsg("Password reset email sent — check your inbox.");
                    }}
                    className="text-[13px] font-bold text-zinc-500 hover:text-zinc-950 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-zinc-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 pl-12 pr-12 rounded-2xl border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white text-[15px] text-zinc-900 font-medium placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 bg-red-50/80 border border-red-200 text-red-600 p-4 rounded-2xl mt-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-[14px] font-medium leading-snug">{error}</p>
                  </div>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 bg-emerald-50/80 border border-emerald-200 text-emerald-600 p-4 rounded-2xl mt-2">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                    <p className="text-[14px] font-medium leading-snug">{successMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full h-14 mt-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-[0.985] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? "Create Workspace" : "Sign In to Cortex"}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-[14px] font-medium text-zinc-500 mt-8">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
                setPassword('');
              }}
              className="font-bold text-zinc-950 hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
