"use client";

// app/library/page.tsx — upload PDFs and browse the document library.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import ConfirmDialog from "@/components/ConfirmDialog";
import Dropzone from "@/components/library/Dropzone";
import UploadQueue from "@/components/library/UploadQueue";
import DocumentList from "@/components/library/DocumentList";
import { useUploadQueue } from "@/components/library/useUploadQueue";
import { Button, IconButton, Logo } from "@/components/ui";
import { ApiError, deleteDocument, getLimits, listDocuments, wakeBackend } from "@/lib/api";
import type { DocumentItem } from "@/types";

type Sort = "newest" | "oldest" | "name" | "pages";
const PAGE_SIZE = 20;

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Skeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface" aria-label="Loading documents" role="status">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 border-t border-line px-4 py-4 first:border-t-0">
          <div className="h-9 w-[30px] rounded bg-surface-2" />
          <div className="relative h-3 flex-1 overflow-hidden rounded bg-surface-2">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-ink/5 to-transparent" />
          </div>
          <div className="h-3 w-16 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const [docs, setDocs] = useState<DocumentItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maxMb, setMaxMb] = useState(25);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<"list" | "grid">("list");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoadError(null);
    try {
      setDocs(await listDocuments(signal));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(err instanceof ApiError ? err.message : "Couldn't load your documents.");
    }
  }, []);

  useEffect(() => {
    wakeBackend();
    const ctrl = new AbortController();
    load(ctrl.signal);
    getLimits().then((l) => setMaxMb(l.max_upload_mb)).catch(() => {});
    try {
      const saved = localStorage.getItem("library-view");
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      /* ignore */
    }
    return () => ctrl.abort();
  }, [load]);

  const queue = useUploadQueue({
    maxMb,
    existing: docs ?? [],
    onUploaded: () => load(),
  });

  const debounced = useDebounced(query, 150);
  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const list = (docs ?? []).filter((d) => !q || d.filename.toLowerCase().includes(q));
    const by: Record<Sort, (a: DocumentItem, b: DocumentItem) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      name: (a, b) => a.filename.localeCompare(b.filename),
      pages: (a, b) => b.num_pages - a.num_pages,
    };
    return [...list].sort(by[sort]);
  }, [docs, debounced, sort]);

  useEffect(() => setShown(PAGE_SIZE), [debounced, sort]);

  function changeView(v: "list" | "grid") {
    setView(v);
    try {
      localStorage.setItem("library-view", v);
    } catch {
      /* ignore */
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDocument(toDelete.document_id);
      // Removed only after the server confirms — no optimistic delete to roll back.
      setDocs((prev) => (prev ?? []).filter((d) => d.document_id !== toDelete.document_id));
      setToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete this document.");
    } finally {
      setDeleting(false);
    }
  }

  const hasDocs = (docs?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar docCount={docs ? docs.length : null} />

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <Logo />
          <ThemeToggle />
        </header>

        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-7 sm:px-8 lg:py-9">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-1"
          >
            <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Library</h1>
            <p className="text-sm text-muted">Upload PDFs, then open one to ask questions about it.</p>
          </motion.div>

          <Dropzone onFiles={queue.addFiles} maxMb={maxMb} compact={hasDocs} />

          <UploadQueue
            items={queue.items}
            onCancel={queue.cancel}
            onRetry={queue.retry}
            onDismiss={queue.dismiss}
            onUploadAnyway={queue.uploadAnyway}
            onClearFinished={queue.clearFinished}
          />

          {loadError ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-danger-soft px-4 py-3.5 text-sm">
              <span className="text-danger">{loadError}</span>
              <Button size="sm" onClick={() => load()}>Try again</Button>
            </div>
          ) : docs === null ? (
            <Skeleton />
          ) : !hasDocs ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-line bg-surface px-6 py-10 text-center"
            >
              <p className="font-medium">No documents yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Upload a report, contract or paper above. Once it&apos;s processed you can ask it questions.
              </p>
            </motion.div>
          ) : (
            <section aria-label="Documents" className="flex flex-col gap-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex h-10 min-w-[200px] flex-[1_1_240px] items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-brand">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-faint" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <span className="sr-only">Search documents by name</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name"
                    className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="text-xs text-muted hover:text-ink">Clear</button>
                  )}
                </label>
                <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px]">
                  <span className="text-muted">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="h-full cursor-pointer bg-transparent font-medium outline-none"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">Name A–Z</option>
                    <option value="pages">Most pages</option>
                  </select>
                </label>
                <div role="group" aria-label="View" className="flex overflow-hidden rounded-lg border border-line">
                  <IconButton label="List view" aria-pressed={view === "list"} onClick={() => changeView("list")} className={`!h-10 !w-10 !rounded-none ${view === "list" ? "!bg-brand-soft !text-brand" : ""}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                  </IconButton>
                  <IconButton label="Grid view" aria-pressed={view === "grid"} onClick={() => changeView("grid")} className={`!h-10 !w-10 !rounded-none border-l border-line ${view === "grid" ? "!bg-brand-soft !text-brand" : ""}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>
                  </IconButton>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {filtered.length === 0 ? (
                  <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center text-sm text-muted">
                    No documents match “{debounced}”.
                  </motion.p>
                ) : (
                  <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <DocumentList docs={filtered.slice(0, shown)} view={view} onDelete={(d) => { setDeleteError(null); setToDelete(d); }} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
                <span>
                  Showing {Math.min(shown, filtered.length)} of {filtered.length} document{filtered.length === 1 ? "" : "s"}
                </span>
                {shown < filtered.length && (
                  <Button size="sm" onClick={() => setShown((s) => s + PAGE_SIZE)}>Show more</Button>
                )}
              </div>
            </section>
          )}

          <p className="text-center text-xs text-faint">
            <Link href="/" className="hover:text-ink lg:hidden">← Back to home</Link>
          </p>
        </main>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this document?"
        body={
          <>
            <span className="font-medium text-ink">{toDelete?.filename}</span> and its chat history will be
            permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete"
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
