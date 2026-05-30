// app/chat/page.tsx — the Chat / Dashboard page
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PanelRightOpen, PanelRightClose, Loader2 } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import PdfViewer from "@/components/PdfViewer";
import ChatInterface from "@/components/ChatInterface";
import SourcesPanel from "@/components/SourcesPanel";
import { getHistory } from "@/lib/api";
import type { HistoryItem, Source, UploadResponse } from "@/types";

function ChatDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const documentId = params.get("doc");

  const [doc, setDoc] = useState<UploadResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(true);

  // Load the active document info that the landing page stored.
  useEffect(() => {
    if (!documentId) {
      router.push("/");
      return;
    }
    const stored = sessionStorage.getItem("activeDocument");
    if (stored) {
      const parsed = JSON.parse(stored) as UploadResponse;
      if (parsed.document_id === documentId) setDoc(parsed);
    }
    // Load any existing history for this document.
    getHistory(documentId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [documentId, router]);

  // When the chat produces new sources, refresh history too.
  function handleSources(next: Source[]) {
    setSources(next);
    setShowSources(true);
    if (documentId) {
      getHistory(documentId).then(setHistory).catch(() => {});
    }
  }

  if (!documentId) return null;

  return (
    <div className="relative z-10 flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block">
        <Sidebar doc={doc} history={history} />
      </div>

      {/* Main dashboard grid */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3">
          <h1 className="font-display text-lg font-semibold">
            {doc?.filename ?? "Document"}
          </h1>
          <button
            onClick={() => setShowSources((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm transition-colors hover:border-[var(--accent)]"
          >
            {showSources ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
            Sources
          </button>
        </div>

        {/* Three-pane: PDF | Chat | Sources */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_1fr]">
          {/* PDF viewer (hidden on small screens to prioritize chat) */}
          <div className="hidden lg:block">
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
              <ChatInterface
                documentId={documentId}
                onSources={handleSources}
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
