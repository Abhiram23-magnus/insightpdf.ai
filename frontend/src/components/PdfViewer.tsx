"use client";

// PDF pane. Uses the browser's own PDF viewer (zoom, search and page
// controls come built in) and jumps to a page via the `#page=N` URL fragment
// whenever a citation is clicked.
//
// Most phone browsers can't show a PDF inside a page, so there we show a
// card that opens the PDF (at the right page) in the phone's viewer instead.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getPdfUrl } from "@/lib/api";
import { buttonClass } from "@/components/ui";

export default function PdfViewer({
  documentId,
  page,
  pageCount,
  onPageChange,
  flash,
}: {
  documentId: string;
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  /** Increments each time a citation is clicked, to replay the highlight. */
  flash: number;
}) {
  const [inline, setInline] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState(String(page));
  const [url, setUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // The file is private: ask the server for a signed link (valid 1 hour) and
  // renew it a little before it expires.
  useEffect(() => {
    const ctrl = new AbortController();
    setUrlError(false);
    getPdfUrl(documentId, ctrl.signal)
      .then(setUrl)
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setUrlError(true);
      });
    const renew = setTimeout(() => setAttempt((a) => a + 1), 50 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearTimeout(renew);
    };
  }, [documentId, attempt]);

  useEffect(() => setDraft(String(page)), [page]);

  useEffect(() => {
    // `pdfViewerEnabled` is false on most phones; undefined on very old browsers.
    const nav = navigator as Navigator & { pdfViewerEnabled?: boolean };
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setInline(nav.pdfViewerEnabled ?? !coarse);
  }, []);

  const src = url ? `${url}#page=${page}` : undefined;

  function go(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.min(Math.max(1, parseInt(draft, 10) || 1), Math.max(1, pageCount));
    onPageChange(n);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[color-mix(in_srgb,var(--bg)_80%,#000)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <form onSubmit={go} className="flex items-center gap-1.5 font-mono text-[13px] text-muted">
          <label htmlFor="page-input">Page</label>
          <input
            id="page-input"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            onBlur={go}
            className="h-8 w-12 rounded-md border border-line bg-bg text-center text-ink outline-none focus:border-brand"
          />
          <span>/ {pageCount || "—"}</span>
        </form>
        <span className="hidden text-xs text-faint xl:inline">Zoom and search are in the viewer toolbar</span>
        <a href={src} target="_blank" rel="noreferrer" aria-disabled={!src} className={`ml-auto ${buttonClass("ghost", "sm")} ${src ? "" : "pointer-events-none opacity-50"}`}>
          Open in new tab
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
        </a>
      </div>

      <div className="relative min-h-0 flex-1">
        {urlError ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <p className="font-medium">Couldn&apos;t load the PDF</p>
              <button type="button" onClick={() => setAttempt((a) => a + 1)} className={`mt-3 ${buttonClass("secondary", "sm")}`}>Try again</button>
            </div>
          </div>
        ) : !src ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted" role="status">Loading PDF…</div>
        ) : inline === false ? (
          <div className="grid h-full place-items-center p-6">
            <div className="max-w-xs text-center">
              <p className="font-medium">Your browser can&apos;t show the PDF here</p>
              <p className="mt-1.5 text-sm text-muted">Open it in your phone&apos;s PDF viewer — it&apos;ll start on page {page}.</p>
              <a href={src} target="_blank" rel="noreferrer" className={`mt-4 ${buttonClass("primary", "md")}`}>
                Open page {page}
              </a>
            </div>
          </div>
        ) : inline === true ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted" role="status">
                Loading PDF…
              </div>
            )}
            <iframe
              key={documentId}
              src={src}
              title="PDF document"
              onLoad={() => setLoaded(true)}
              className={`h-full w-full transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
            {/* Brief cyan flash on the pane edge when a citation jumps here. */}
            <AnimatePresence>
              {flash > 0 && (
                <motion.div
                  key={flash}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-inset ring-cite"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </div>
  );
}
