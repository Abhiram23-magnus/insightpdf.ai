"use client";

// Accessible confirmation dialog: Esc closes, focus starts on Cancel,
// Tab stays inside, and focus returns to what opened it.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab" && panel.current) {
        const focusable = panel.current.querySelectorAll<HTMLElement>("button:not([disabled])");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            ref={panel}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-body"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
          >
            <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
            <div id="confirm-body" className="mt-2 text-sm leading-relaxed text-muted">{body}</div>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button ref={cancelRef} onClick={onClose} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={onConfirm} disabled={busy}>
                {busy ? "Deleting…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
