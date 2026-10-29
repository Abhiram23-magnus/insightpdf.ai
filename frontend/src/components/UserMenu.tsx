"use client";

// The signed-in account: email + sign out. `compact` is the mobile top-bar version.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/components/AuthProvider";

function Initial({ email }: { email: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-semibold uppercase text-brand-text">
      {email.charAt(0) || "?"}
    </span>
  );
}

export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const email = session?.user.email ?? "";

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!session) return null;

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    router.replace("/signin");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={compact ? `Account: ${email}` : undefined}
        className={
          compact
            ? "grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2"
            : "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
        }
      >
        <Initial email={email} />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{email}</span>
            <span className="block text-xs text-faint">Signed in</span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: compact ? -4 : 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: compact ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={`absolute z-30 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.7)] ${
              compact ? "right-0 top-12" : "bottom-14 left-0"
            }`}
          >
            <p className="truncate px-2.5 py-2 text-xs text-faint">{email}</p>
            <button
              role="menuitem"
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
