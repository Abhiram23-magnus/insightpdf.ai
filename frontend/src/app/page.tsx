// app/page.tsx — the Landing Page
"use client";

import { useRouter } from "next/navigation";
import {
  Sparkles,
  FileSearch,
  MessagesSquare,
  Quote,
  ScrollText,
} from "lucide-react";
import UploadCard from "@/components/UploadCard";
import ThemeToggle from "@/components/ThemeToggle";
import type { UploadResponse } from "@/types";

export default function LandingPage() {
  const router = useRouter();

  // When a PDF finishes uploading, stash its info and go to the chat page.
  function handleUploaded(doc: UploadResponse) {
    sessionStorage.setItem("activeDocument", JSON.stringify(doc));
    router.push(`/chat?doc=${doc.document_id}`);
  }

  return (
    <main className="relative z-10 min-h-screen">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-black">
            <ScrollText className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">
            InsightPDF<span className="text-[var(--accent)]"> AI</span>
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-12 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm text-[var(--text-muted)] animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
          Powered by RAG · LangChain · ChromaDB · Gemini
        </div>

        <h1
          className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl animate-fade-up"
          style={{ animationDelay: "0.05s" }}
        >
          Turn Documents into
          <br />
          <span className="text-[var(--accent)]">Actionable Insights</span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl text-lg text-[var(--text-muted)] animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          Upload any PDF and have a conversation with it. Ask questions, get
          grounded answers, and see exactly which page each answer came from.
        </p>

        {/* Upload */}
        <div
          className="mx-auto mt-12 max-w-xl animate-fade-up"
          style={{ animationDelay: "0.25s" }}
        >
          <UploadCard onUploaded={handleUploaded} />
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto mt-24 max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: FileSearch,
              title: "Smart Retrieval",
              body: "Your PDF is split into chunks and embedded into a vector database, so the most relevant passages are found instantly.",
            },
            {
              icon: MessagesSquare,
              title: "Grounded Answers",
              body: "Gemini answers using only the retrieved context, keeping responses accurate and tied to your document.",
            },
            {
              icon: Quote,
              title: "Cited Sources",
              body: "Every answer shows the exact pages and snippets it was based on, so you can verify and dig deeper.",
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] animate-fade-up"
              style={{ animationDelay: `${0.3 + i * 0.08}s` }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--accent)]">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
