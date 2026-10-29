// app/chat/page.tsx — the Chat / Dashboard page
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  PanelRightOpen,
  PanelRightClose,
  Loader2,
  ArrowLeft,
  FileWarning,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import PdfViewer from "@/components/PdfViewer";
import ChatInterface from "@/components/ChatInterface";
import SourcesPanel from "@/components/SourcesPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { getHistory, listDocuments } from "@/lib/api";
import type { HistoryItem, Source, UploadResponse } from "@/types";

type Status = "loading" | "ready" | "missing" | "error";

function ChatDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const documentId = params.get("doc");

  const [doc, setDoc] = useState<UploadResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(true);

  // Load the document info + its chat history.
  useEffect(() => {
    if (!documentId) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setSources([]);
    setHistory([]);

    // The landing page stores the just-uploaded doc so we can show it instantly.
    let stored: UploadResponse | null = null;
    try {
      const raw = sessionStorage.getItem("activeDocument");
      const parsed = raw ? (JSON.parse(raw) as UploadResponse) : null;
      if (parsed?.document_id === documentId) stored = parsed;
    } catch {
      // ignore bad/blocked storage
    }

    async function load() {
      try {
        // Always confirm with the server: the free backend wipes its data
        // when it restarts, so an old link may point to a deleted document.
        const docs = await listDocuments();
        if (cancelled) return;
        const found = docs.find((d) => d.document_id === documentId);
        if (!found) {
          setStatus("missing");
          return;
        }
        setDoc(
          stored ?? {
            document_id: found.document_id,
            filename: found.filename,
            num_pages: found.num_pages,
            num_chunks: found.num_chunks,
            message: "Document loaded from server.",
          }
        );
        setStatus("ready");

        const items = await getHistory(documentId!).catch(() => []);
        if (!cancelled) setHistory(items);
      } catch {
        if (cancelled) return;
        // Server unreachable: still show the chat if we know the doc.
        if (stored) {
          setDoc(stored);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [documentId, router]);

  // When the chat produces new sources, refresh history too.
  const handleSources = useCallback(
    (next: Source[]) => {
      setSources(next);
      if (documentId) {
        getHistory(documentId).then(setHistory).catch(() => {});
      }
    },
    [documentId]
  );

  const handleMissing = useCallback(() => setStatus("missing"), []);

  if (!documentId) return null;

  if (status === "loading") {
    return (
      <div className="relative z-10 grid h-screen place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Loading your document… (the server may take a moment to wake up)
          </p>
        </div>
      </div>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <div className="relative z-10 grid h-screen place-items-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--accent)]">
            <FileWarning className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">
            {status === "missing"
              ? "This document isn't available anymore"
              : "Can't reach the server"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {status === "missing"
              ? "The free server clears uploaded files when it restarts. Upload the PDF again to keep chatting."
              : "The server may be waking up. Wait a few seconds and reload, or upload the PDF again."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-black transition-transform hover:scale-105"
          >
            Upload a PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-[100dvh] overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block">
        <Sidebar doc={doc} history={history} />
      </div>

      {/* Main dashboard grid */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile only: the sidebar is hidden, so give a way back home. */}
            <button
              onClick={() => router.push("/")}
              aria-label="Upload a new document"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--border)] md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="truncate font-display text-lg font-semibold">
              {doc?.filename ?? "Document"}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowSources((s) => !s)}
              className="hidden items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm transition-colors hover:border-[var(--accent)] xl:flex"
            >
              {showSources ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
              Sources
            </button>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Three-pane: PDF | Chat | Sources */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_1fr]">
          {/* PDF viewer (hidden on small screens to prioritize chat) */}
          <div className="hidden min-h-0 lg:block">
            {doc && (
              <PdfViewer documentId={documentId} fileName={doc.filename} />
            )}
          </div>

          {/* Chat + Sources */}
          <div
            className={`grid min-h-0 ${
              showSources ? "grid-cols-1 xl:grid-cols-[1fr_320px]" : "grid-cols-1"
            }`}
          >
            <div className="min-h-0 bg-[var(--bg)]">
              {/* key: start a fresh chat when switching documents */}
              <ChatInterface
                key={documentId}
                documentId={documentId}
                history={history}
                onSources={handleSources}
                onMissingDocument={handleMissing}
              />
            </div>
            {showSources && (
              <div className="hidden min-h-0 xl:block">
                <SourcesPanel sources={sources} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  // useSearchParams must be wrapped in Suspense in the Next.js App Router.
  return (
    <Suspense
      fallback={
        <div className="grid h-screen place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <ChatDashboard />
    </Suspense>
  );
}
