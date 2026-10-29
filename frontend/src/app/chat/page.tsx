"use client";

// app/chat/page.tsx — the document workspace (PDF + chat).
// Desktop: side by side. Phones/tablets: Chat / PDF / Sources tabs.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import ChatInterface from "@/components/ChatInterface";
import PdfViewer from "@/components/PdfViewer";
import SourcesPanel from "@/components/SourcesPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { buttonClass, Spinner } from "@/components/ui";
import { getHistory, listDocuments, pdfFileUrl } from "@/lib/api";
import type { DocumentItem, HistoryItem, Source } from "@/types";

type Status = "loading" | "ready" | "missing" | "error";
type Tab = "chat" | "pdf" | "sources";

/** True at ≥1024px. Renders only one layout, so the chat is never mounted twice. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center px-6">{children}</div>;
}

function Workspace() {
  const params = useSearchParams();
  const router = useRouter();
  const documentId = params.get("doc");

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [page, setPage] = useState(1);
  const [flash, setFlash] = useState(0);
  const [tab, setTab] = useState<Tab>("chat");
  const [attempt, setAttempt] = useState(0);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!documentId) {
      router.replace("/library");
      return;
    }
    const ctrl = new AbortController();
    setStatus("loading");
    // Document info and history load in parallel (no waterfall).
    Promise.all([listDocuments(ctrl.signal), getHistory(documentId, ctrl.signal).catch(() => [])])
      .then(([docs, hist]) => {
        const found = docs.find((d) => d.document_id === documentId);
        if (!found) {
          setStatus("missing");
          return;
        }
        setDoc(found);
        setHistory(hist);
        setStatus("ready");
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
      });
    return () => ctrl.abort();
  }, [documentId, router, attempt]);

  const handleSources = useCallback((s: Source[]) => setSources(s), []);
  const handleMissing = useCallback(() => setStatus("missing"), []);

  const cite = useCallback((p: number) => {
    setPage(p);
    setFlash((n) => n + 1);
    // On small screens, switch to the PDF tab so the jump is visible.
    if (!window.matchMedia("(min-width: 1024px)").matches) setTab("pdf");
  }, []);

  if (!documentId) return null;

  if (status === "loading") {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3 text-sm text-muted" role="status">
          <Spinner className="h-5 w-5 text-brand" />
          Opening your document… (the server may take a moment to wake up)
        </div>
      </Centered>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <Centered>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">
            {status === "missing" ? "This document isn't available" : "Can't reach the server"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {status === "missing"
              ? "It may have been deleted, or the free server cleared it when it restarted. Upload the PDF again to keep going."
              : "The server may still be waking up. Try again in a few seconds."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {status === "error" && (
              <button onClick={() => setAttempt((a) => a + 1)} className={buttonClass("secondary")}>Try again</button>
            )}
            <Link href="/library" className={buttonClass("primary")}>Go to library</Link>
          </div>
        </motion.div>
      </Centered>
    );
  }

  const pdf = (
    <PdfViewer documentId={documentId} page={page} pageCount={doc?.num_pages ?? 0} onPageChange={(p) => { setPage(p); setFlash((n) => n + 1); }} flash={flash} />
  );
  const chat = (
    <ChatInterface
      key={documentId}
      documentId={documentId}
      history={history}
      onCite={cite}
      onSources={handleSources}
      onMissingDocument={handleMissing}
    />
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "pdf", label: "PDF" },
    { id: "sources", label: sources.length ? `Sources · ${new Set(sources.map((s) => s.page)).size}` : "Sources" },
  ];

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <Link href="/library" aria-label="Back to library" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold">{doc?.filename}</h1>
          <p className="text-xs text-faint">
            {doc?.num_pages} pages · {doc?.num_chunks} passages indexed
          </p>
        </div>
        <a href={pdfFileUrl(documentId)} target="_blank" rel="noreferrer" className={`hidden sm:inline-flex ${buttonClass("secondary", "sm")}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></svg>
          Download
        </a>
        <ThemeToggle />
      </header>

      {/* Mobile / tablet tabs */}
      {!isDesktop && (
      <div className="border-b border-line bg-surface px-3 pb-2.5">
        <div role="tablist" aria-label="Workspace views" className="flex gap-1 rounded-lg border border-line bg-bg p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative h-9 flex-1 rounded-md text-sm transition-colors ${tab === t.id ? "font-semibold text-ink" : "text-muted"}`}
            >
              {tab === t.id && (
                <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-md bg-bubble" transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }} />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {isDesktop ? (
      /* Desktop: split view */
      <div className="flex min-h-0 flex-1">
        <motion.section
          aria-label="PDF viewer"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="min-w-0 flex-[1.1] border-r border-line"
        >
          {pdf}
        </motion.section>
        <motion.section
          aria-label="Ask about this document"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="min-w-0 flex-1"
        >
          {chat}
        </motion.section>
      </div>

      ) : (
      /* Phones/tablets: one panel at a time. Chat stays mounted (just hidden)
         so an answer keeps streaming while you look at the PDF. */
      <div className="relative min-h-0 flex-1">
        <div id="panel-chat" role="tabpanel" aria-labelledby="tab-chat" className={tab === "chat" ? "h-full" : "hidden"}>
          {chat}
        </div>
        {tab === "pdf" && (
          <motion.div id="panel-pdf" role="tabpanel" aria-labelledby="tab-pdf" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {pdf}
          </motion.div>
        )}
        {tab === "sources" && (
          <motion.div id="panel-sources" role="tabpanel" aria-labelledby="tab-sources" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SourcesPanel sources={sources} onCite={cite} />
          </motion.div>
        )}
      </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <Centered>
          <Spinner className="h-5 w-5 text-brand" />
        </Centered>
      }
    >
      <Workspace />
    </Suspense>
  );
}
