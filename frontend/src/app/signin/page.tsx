"use client";

// app/signin/page.tsx — sign in, create an account, or reset a password.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { Button, Logo, Spinner } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup" | "forgot";

const copy: Record<Mode, { title: string; sub: string; cta: string }> = {
  signin: { title: "Welcome back", sub: "Sign in to open your library.", cta: "Sign in" },
  signup: { title: "Create your account", sub: "Your PDFs and chats stay private to you.", cta: "Create account" },
  forgot: { title: "Reset your password", sub: "We'll email you a link to choose a new one.", cta: "Send reset link" },
};

/** Only allow redirects within this site. */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/library";
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Check them and try again.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "There's already an account with this email. Sign in instead.";
  if (m.includes("email not confirmed")) return "Confirm your email first — check your inbox for the link.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("password should be") || m.includes("weak")) return "Choose a stronger password (at least 8 characters).";
  if (m.includes("invalid") && m.includes("email")) return "Enter a valid email address.";
  if (m.includes("fetch")) return "Can't reach the sign-in service. Check your connection and try again.";
  return message;
}

function SignInForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { session, loading } = useAuth();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in (or just signed in) → go where they were headed.
  useEffect(() => {
    if (!loading && session) router.replace(next);
  }, [loading, session, router, next]);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const addr = email.trim();
    if (!addr) return setError("Enter your email address.");
    if (mode !== "forgot" && !password) return setError("Enter your password.");
    if (mode === "signup" && password.length < 8) return setError("Use at least 8 characters for your password.");

    setBusy(true);
    const auth = supabase().auth;
    try {
      if (mode === "signin") {
        const { error } = await auth.signInWithPassword({ email: addr, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await auth.signUp({
          email: addr,
          password,
          options: { emailRedirectTo: `${window.location.origin}/signin?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice(`Almost done — we sent a confirmation link to ${addr}. Open it to finish creating your account.`);
        }
      } else {
        const { error } = await auth.resetPasswordForEmail(addr, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice(`If an account exists for ${addr}, a reset link is on its way.`);
      }
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const c = copy[mode];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-260px] h-[520px] w-[820px] -translate-x-1/2"
        style={{ background: "radial-gradient(closest-side, var(--glow), transparent)" }}
      />
      <header className="relative flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
          className="w-full max-w-[400px] rounded-2xl border border-line bg-surface p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)] sm:p-8"
        >
          {mode !== "forgot" && (
            <div role="tablist" aria-label="Account" className="mb-6 flex gap-1 rounded-lg border border-line bg-bg p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  type="button"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`relative h-9 flex-1 rounded-md text-sm transition-colors ${mode === m ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}
                >
                  {mode === m && (
                    <motion.span layoutId="auth-pill" className="absolute inset-0 rounded-md bg-bubble" transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }} />
                  )}
                  <span className="relative">{m === "signin" ? "Sign in" : "Create account"}</span>
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{c.title}</h1>
              <p className="mt-1 text-sm text-muted">{c.sub}</p>
            </motion.div>
          </AnimatePresence>

          <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Email</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg border border-line bg-bg px-3 text-[15px] outline-none transition-colors placeholder:text-faint focus:border-brand"
                placeholder="you@example.com"
                required
              />
            </label>

            {mode !== "forgot" && (
              <label className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between text-[13px] font-medium">
                  Password
                  {mode === "signin" && (
                    <button type="button" onClick={() => switchMode("forgot")} className="text-xs font-normal text-brand-text hover:underline">
                      Forgot password?
                    </button>
                  )}
                </span>
                <span className="flex h-11 items-center rounded-lg border border-line bg-bg pr-1 transition-colors focus-within:border-brand">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none"
                    aria-describedby={mode === "signup" ? "pw-hint" : undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="h-9 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-ink"
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
                {mode === "signup" && (
                  <span id="pw-hint" className="text-xs text-faint">At least 8 characters.</span>
                )}
              </label>
            )}

            <AnimatePresence>
              {error && (
                <motion.p key="err" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
                  {error}
                </motion.p>
              )}
              {notice && (
                <motion.p key="ok" role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-lg bg-success-soft px-3 py-2.5 text-sm text-success">
                  {notice}
                </motion.p>
              )}
            </AnimatePresence>

            <Button type="submit" variant="primary" size="lg" disabled={busy} className="mt-1 w-full">
              {busy && <Spinner />}
              {c.cta}
            </Button>
          </form>

          {mode === "forgot" && (
            <button type="button" onClick={() => switchMode("signin")} className="mt-5 text-sm text-muted hover:text-ink">
              ← Back to sign in
            </button>
          )}
        </motion.div>

        <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-faint">
          Each account has its own private library. Only you can see your PDFs, passages and chats.{" "}
          <Link href="/#privacy" className="underline hover:text-ink">How your files are handled</Link>
        </p>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <Spinner className="h-5 w-5 text-brand" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
