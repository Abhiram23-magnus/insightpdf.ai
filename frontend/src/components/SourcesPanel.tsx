// components/SourcesPanel.tsx
"use client";

// Shows which chunks/pages were used to answer the most recent question.
// This is the "explainability" feature — it builds trust by letting the
// user verify the AI's answer against the original document.

import { Quote, FileText } from "lucide-react";
import type { Source } from "@/types";

interface Props {
  sources: Source[];
}

export default function SourcesPanel({ sources }: Props) {
  return (
    <aside className="flex h-full flex-col border-l border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <Quote className="h-4 w-4 text-[var(--accent)]" />
        <h2 className="font-display text-lg font-semibold">Sources</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {sources.length === 0 ? (
          <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
            Ask a question to see the passages used for the answer.
          </p>
        ) : (
          sources.map((s, i) => (
            <div
              key={`${s.chunk_index}-${i}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--accent)]">
                <FileText className="h-3.5 w-3.5" />
                Page {s.page} · Chunk {s.chunk_index}
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {s.snippet}
              </p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
