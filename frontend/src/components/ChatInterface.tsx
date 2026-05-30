// components/ChatInterface.tsx
"use client";

// The conversational core: a scrolling message list + an input box.
// It owns the list of messages and reports new sources upward so the
// SourcesPanel can display them.

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles, User } from "lucide-react";
import { askQuestion } from "@/lib/api";
import type { ChatMessage, Source } from "@/types";

interface Props {
  documentId: string;
  onSources: (sources: Source[]) => void;
}

export default function ChatInterface({ documentId, onSources }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;

    setError(null);
    setInput("");

    // Optimistically add the user's message.
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await askQuestion(documentId, question);
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.answer,
        sources: res.sources,
      };
      setMessages((prev) => [...prev, aiMsg]);
      onSources(res.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Enter to send, Shift+Enter for a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {messages.length === 0 && !loading && (
          <div className="mt-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--accent)]">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="mt-4 font-display text-xl font-semibold">
              Ask anything about your document
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
              Try “Summarize the key points” or “What does it say about
              methodology?”
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 animate-fade-up ${
              m.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                m.role === "user"
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--surface-2)] text-[var(--accent)]"
              }`}
            >
              {m.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Based on{" "}
                  {Array.from(new Set(m.sources.map((s) => s.page)))
                    .sort((a, b) => a - b)
                    .map((p) => `p.${p}`)
                    .join(", ")}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--accent)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse-dot"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-6 pb-2 text-sm text-red-500 animate-fade-in">{error}</p>
      )}

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask a question about your PDF…"
            className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-black transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
