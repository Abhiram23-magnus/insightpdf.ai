"use client";

// The list of in-flight uploads, with real progress, processing state,
// cancel, retry and clear error messages.
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Button, IconButton, Spinner } from "@/components/ui";
import { plural } from "@/lib/format";
import type { UploadItem } from "./useUploadQueue";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Row({
  item,
  onCancel,
  onRetry,
  onDismiss,
  onUploadAnyway,
}: {
  item: UploadItem;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  onUploadAnyway: () => void;
}) {
  const { file, state, progress, error, result } = item;
  const failed = state === "error";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 overflow-hidden border-t border-line px-4 py-3.5 first:border-t-0 ${
        failed ? "bg-danger-soft" : ""
      }`}
    >
      <div className="min-w-0 flex-[1_1_200px]">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="font-mono text-xs text-faint">{formatSize(file.size)}</p>
      </div>

      <div className="flex min-w-0 flex-[2_1_240px] flex-col gap-1.5" aria-live="polite">
        {state === "queued" && <span className="text-[13px] text-muted">Waiting — files are processed one at a time</span>}

        {state === "uploading" && (
          <>
            <div
              className="relative h-1.5 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label={`Uploading ${file.name}`}
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                className="h-full rounded-full bg-brand"
                animate={{ width: `${Math.max(3, progress * 100)}%` }}
                transition={{ ease: "easeOut", duration: 0.25 }}
              />
            </div>
            <span className="text-xs text-muted">
              Uploading · {Math.round(progress * 100)}% · {formatSize(file.size * progress)} of {formatSize(file.size)}
            </span>
          </>
        )}

        {state === "processing" && (
          <>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className="absolute inset-y-0 w-2/5 animate-indeterminate rounded-full bg-brand" />
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1 text-success">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                Uploaded
              </span>
              <span className="text-faint">→</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-brand">
                <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-brand" />
                Reading and indexing
              </span>
              <span className="hidden text-faint sm:inline">· large PDFs take a few minutes</span>
            </span>
          </>
        )}

        {state === "done" && result && (
          <span className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              Ready
            </span>
            <span className="text-muted">{plural(result.num_pages, "page")}</span>
            <Link href={`/chat?doc=${result.document_id}`} className="font-medium text-brand hover:underline">
              Open →
            </Link>
          </span>
        )}

        {state === "duplicate" && (
          <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            A file with this name is already in your library.
            <button onClick={onUploadAnyway} className="font-medium text-brand hover:underline">Upload anyway</button>
          </span>
        )}

        {failed && <span className="text-[13px] text-danger">{error}</span>}
      </div>

      <div className="flex items-center gap-1">
        {failed && !item.permanent && (
          <Button size="sm" onClick={onRetry}>Retry</Button>
        )}
        {state === "uploading" || state === "queued" ? (
          <IconButton label={`Cancel upload of ${file.name}`} size="sm" onClick={onCancel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </IconButton>
        ) : state === "processing" ? (
          <span className="grid h-8 w-8 place-items-center text-brand" title="Processing">
            <Spinner />
          </span>
        ) : (
          <IconButton label={`Dismiss ${file.name}`} size="sm" onClick={onDismiss}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </IconButton>
        )}
      </div>
    </motion.li>
  );
}

export default function UploadQueue({
  items,
  onCancel,
  onRetry,
  onDismiss,
  onUploadAnyway,
  onClearFinished,
}: {
  items: UploadItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onUploadAnyway: (id: string) => void;
  onClearFinished: () => void;
}) {
  const active = items.filter((i) => i.state === "uploading" || i.state === "processing" || i.state === "queued").length;
  const finished = items.filter((i) => i.state === "done").length;

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.section
          aria-label="Uploads"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="overflow-hidden rounded-xl border border-line bg-surface"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[13px]">
            <span className="font-semibold">
              {active > 0 ? `Uploading ${active} file${active === 1 ? "" : "s"}` : "Uploads"}
            </span>
            {finished > 0 && (
              <button onClick={onClearFinished} className="text-muted hover:text-ink">Clear finished</button>
            )}
          </div>
          <ul>
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  onCancel={() => onCancel(item.id)}
                  onRetry={() => onRetry(item.id)}
                  onDismiss={() => onDismiss(item.id)}
                  onUploadAnyway={() => onUploadAnyway(item.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
