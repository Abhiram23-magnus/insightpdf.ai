// components/Sidebar.tsx
"use client";

// A simple, collapsible-on-mobile sidebar showing the brand, the active
// document, and chat history for that document.

import { useRouter } from "next/navigation";
import { ScrollText, Plus, History, FileText } from "lucide-react";
import type { HistoryItem, UploadResponse } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

interface Props {
  doc: UploadResponse | null;
  history: HistoryItem[];
}

export default function Sidebar({ doc, history }: Props) {
  const router = useRouter();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-black">
            <ScrollText className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold">
            InsightPDF<span className="text-[var(--accent)]"> AI</span>
          </span>
        </button>
        <ThemeToggle />
      </div>

      {/* New document */}
      <div className="px-4">
        <button
          onClick={() => router.push("/")}
          className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:border-[var(--accent)]"
        >
          <Plus className="h-4 w-4" />
          New document
        </button>
      </div>

      {/* Active document */}
      {doc && (
        <div className="mt-6 px-4">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Current document
          </p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.filename}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {doc.num_pages} pages · {doc.num_chunks} chunks
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col px-4 pb-4">
        <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          <History className="h-3.5 w-3.5" />
          History
        </p>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {history.length === 0 ? (
            <p className="px-1 text-xs text-[var(--text-muted)]">
              Your past questions will appear here.
            </p>
          ) : (
            history
              .slice()
              .reverse()
              .map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  title={h.question}
                >
                  <p className="truncate">{h.question}</p>
                </div>
              ))
          )}
        </div>
      </div>
    </aside>
  );
}
