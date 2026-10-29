"use client";

// The passages used for the latest answer (mobile "Sources" tab).
import { motion } from "motion/react";
import type { Source } from "@/types";

export default function SourcesPanel({
  sources,
  onCite,
}: {
  sources: Source[];
  onCite: (page: number) => void;
}) {
  if (sources.length === 0) {
    return (
      <div className="grid h-full place-items-center p-8 text-center text-sm text-muted">
        Ask a question to see the passages the answer was based on.
      </div>
    );
  }
  return (
    <ul className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {sources.map((s, i) => (
        <motion.li
          key={`${s.page}-${s.chunk_index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-line bg-surface p-4"
        >
          <button onClick={() => onCite(s.page)} className="mb-2 inline-flex min-h-[32px] items-center rounded-md bg-cite-soft px-2.5 font-mono text-[13px] text-cite">
            Page {s.page} →
          </button>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{s.snippet}</p>
        </motion.li>
      ))}
    </ul>
  );
}
