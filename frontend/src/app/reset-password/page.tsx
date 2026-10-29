"use client";

// app/reset-password/page.tsx — reached from the password-reset email link.
// Supabase signs the visitor in from the link; here they choose a new password.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { useAuth } from "@/components/AuthProvider";
import { Button, Logo, Spinner, buttonClass } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/library");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4">
        <Logo />
      </header>
      <main className="grid flex-1 place-items-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] rounded-2xl border border-line bg-surface p-6 sm:p-8"
        >
          {loading ? (
            <div className="grid place-items-center py-8" role="status"><Spinner className="h-5 w-5 text-brand" /></div>
          ) : !session ? (
            <>
              <h1 className="text-[22px] font-semibold">This link has expired</h1>
              <p className="mt-2 text-sm text-muted">Reset links work once and only for a short time. Ask for a new one.</p>
              <Link href="/signin" className={`mt-6 w-full ${buttonClass("primary", "lg")}`}>Back to sign in</Link>
            </>
          ) : (
            <>
              <h1 className="text-[22px] font-semibold">Choose a new password</h1>
              <p className="mt-1 text-sm text-muted">For {session.user.email}</p>
              <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium">New password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg border border-line bg-bg px-3 text-[15px] outline-none focus:border-brand"
                  />
                  <span className="text-xs text-faint">At least 8 characters.</span>
                </label>
                {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>}
                <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
                  {busy && <Spinner />}
                  Save password
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
