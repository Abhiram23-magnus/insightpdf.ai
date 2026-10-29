"use client";

// The library's documents, as a table (list) or cards (grid).
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { IconButton } from "@/components/ui";
import { openPdf } from "@/lib/api";
import type { DocumentItem } from "@/types";

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  if (yesterday) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function PdfIcon() {
  return (
    <span className="grid h-9 w-[30px] shrink-0 place-items-center rounded border border-[color-mix(in_srgb,var(--brand)_30%,transparent)] bg-brand-soft font-mono text-[9px] text-brand">
      PDF
    </span>
  );
}

function ReadyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Ready
    </span>
  );
}

function Actions({ doc, onDelete }: { doc: DocumentItem; onDelete: (d: DocumentItem) => void }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <IconButton label={`Open original ${doc.filename}`} size="sm" onClick={() => openPdf(doc.document_id).catch(() => {})}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></svg>
      </IconButton>
      <IconButton label={`Delete ${doc.filename}`} size="sm" onClick={() => onDelete(doc)} className="hover:!text-danger">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
      </IconButton>
    </div>
  );
}

const rowMotion = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.25, delay: Math.min(i, 8) * 0.04 },
});

export default function DocumentList({
  docs,
  view,
  onDelete,
}: {
  docs: DocumentItem[];
  view: "list" | "grid";
  onDelete: (d: DocumentItem) => void;
}) {
  if (view === "grid") {
    return (
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial>
          {docs.map((doc, i) => (
            <motion.li key={doc.document_id} layout {...rowMotion(i)} whileHover={{ y: -3 }}>
              <div className="flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                <Link href={`/chat?doc=${doc.document_id}`} className="flex min-w-0 items-start gap-3 rounded-md">
                  <PdfIcon />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{doc.filename}</span>
                    <span className="mt-0.5 block font-mono text-xs text-faint">
                      {doc.num_pages === 1 ? "1 page" : `${doc.num_pages} pages`} · {formatDate(doc.created_at)}
                    </span>
                  </span>
                </Link>
                <div className="mt-auto flex items-center justify-between">
                  <ReadyBadge />
                  <Actions doc={doc} onDelete={onDelete} />
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-faint">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-2 py-3 font-medium">Pages</th>
            <th className="px-2 py-3 font-medium">Uploaded</th>
            <th className="px-2 py-3 font-medium">Status</th>
            <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial>
            {docs.map((doc, i) => (
              <motion.tr
                key={doc.document_id}
                layout
                {...rowMotion(i)}
                className="border-t border-line transition-colors hover:bg-surface-2/60"
              >
                <td className="max-w-0 px-4 py-3 sm:max-w-none">
                  <Link href={`/chat?doc=${doc.document_id}`} className="flex min-w-0 items-center gap-3 rounded-md font-medium">
                    <PdfIcon />
                    <span className="truncate">{doc.filename}</span>
                  </Link>
                </td>
                <td className="px-2 py-3 font-mono text-muted">{doc.num_pages}</td>
                <td className="whitespace-nowrap px-2 py-3 text-muted">{formatDate(doc.created_at)}</td>
                <td className="px-2 py-3"><ReadyBadge /></td>
                <td className="px-4 py-3"><Actions doc={doc} onDelete={onDelete} /></td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
