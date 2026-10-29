"use client";

// The conversation: streaming answers, Stop, Retry, Copy, page citations
// that jump the PDF, and suggested questions for a fresh document.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ApiError, streamQuestion } from "@/lib/api";
import { Button, IconButton, PageChip } from "@/components/ui";
import type { ChatMessage, HistoryItem, Source } from "@/types";

const SUGGESTIONS = [
  "Summarize the key points",
  "What are the main conclusions?",
  "List the important numbers and dates",
];

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fromHistory(history: HistoryItem[]): ChatMessage[] {
  return history.flatMap((h) => [
    { id: `${h.id}-q`, role: "user" as const, content: h.question },
    { id: `${h.id}-a`, role: "assistant" as const, content: h.answer, sources: h.sources, status: "done" as const, question: h.question },
  ]);
}

/**
 * Tiny, safe formatter for model output: **bold** and bullet lines.
 * Builds React elements (never raw HTML), so text from the PDF can't inject markup.
 */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*[*-]\s+/.test(line);
        const body = bullet ? line.replace(/^\s*[*-]\s+/, "") : line;
        const parts = body.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-semibold text-ink">{p.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{p}</span>
          )
        );
        if (bullet)
          return (
            <span key={i} className="flex gap-2 pl-1">
              <span className="text-brand">•</span>
              <span>{parts}</span>
            </span>
          );
        return (
          <span key={i} className="block min-h-[0.5em]">
            {parts}
          </span>
        );
      })}
    </>
  );
}

function uniquePages(sources: Source[] = []) {
  return Array.from(new Set(sources.map((s) => s.page))).sort((a, b) => a - b);
}

function Avatar() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#818CF8] to-[#A78BFA]" aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B1020" strokeWidth="2.6" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>
    </span>
  );
}

function AssistantMessage({
  m,
  onCite,
  onRetry,
}: {
  m: ChatMessage;
  onCite: (page: number) => void;
  onRetry: (m: ChatMessage) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showPassages, setShowPassages] = useState(false);
  const pages = uniquePages(m.sources);

  async function copy() {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {m.status === "searching" && (
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-cite" />
            Finding the relevant passages…
          </span>
        )}
        {m.status === "streaming" && m.sources && !m.content && (
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-cite" />
            Found {m.sources.length} passage{m.sources.length === 1 ? "" : "s"} · writing answer
          </span>
        )}

        {m.content && (
          <div className="text-[14.5px] leading-relaxed text-ink/90">
            <Rich text={m.content} />
            {m.status === "streaming" && (
              <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink rounded-[1px] bg-brand" aria-hidden="true" />
            )}
          </div>
        )}

        {m.status === "stopped" && <p className="text-xs text-faint">Stopped</p>}

        {m.status === "error" && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-danger-soft px-3 py-2.5 text-[13px]">
            <span className="text-danger">{m.error}</span>
            <Button size="sm" onClick={() => onRetry(m)}>Retry</Button>
          </div>
        )}

        {pages.length > 0 && (m.status === "done" || m.status === "stopped" || (m.status === "streaming" && m.content)) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-faint">Sources</span>
            {pages.map((p, i) => (
              <PageChip
                key={p}
                page={p}
                accent={i === 0 ? "cite" : "brand"}
                onClick={() => onCite(p)}
                title={m.sources?.find((s) => s.page === p)?.snippet}
              />
            ))}
            <button onClick={() => setShowPassages((v) => !v)} aria-expanded={showPassages} className="ml-1 text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
              {showPassages ? "Hide passages" : "Show passages"}
            </button>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {showPassages && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2 overflow-hidden"
            >
              {m.sources?.map((s) => (
                <li key={`${s.page}-${s.chunk_index}`} className="rounded-lg border border-line bg-surface p-3 text-[13px] leading-relaxed text-muted">
                  <button onClick={() => onCite(s.page)} className="mb-1 font-mono text-xs text-cite hover:underline">
                    Page {s.page}
                  </button>
                  <p className="whitespace-pre-line">{s.snippet}</p>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {(m.status === "done" || m.status === "stopped") && m.content && (
          <div className="-ml-2 flex gap-0.5">
            <button onClick={copy} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
              {copied ? "Copied" : "Copy"}
            </button>
            {m.question && (
              <button onClick={() => onRetry(m)} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatInterface({
  documentId,
  history,
  onCite,
  onSources,
  onMissingDocument,
}: {
  documentId: string;
  history: HistoryItem[];
  onCite: (page: number) => void;
  onSources: (sources: Source[]) => void;
  onMissingDocument: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const seeded = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const busy = messages.some((m) => m.status === "searching" || m.status === "streaming");

  // Load earlier Q&A once.
  useEffect(() => {
    if (seeded.current || history.length === 0) return;
    seeded.current = true;
    setMessages((prev) => (prev.length ? prev : fromHistory(history)));
    const last = history[history.length - 1];
    if (last?.sources?.length) onSources(last.sources);
  }, [history, onSources]);

  // Keep the newest text in view while streaming.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Stop any in-flight answer when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  const update = useCallback((id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)));
  }, []);

  async function ask(question: string, replaceId?: string) {
    const q = question.trim();
    if (!q || busy) return;
    seeded.current = true;

    const answerId = newId();
    const answer: ChatMessage = { id: answerId, role: "assistant", content: "", status: "searching", question: q };
    setMessages((prev) => {
      if (replaceId) return prev.map((m) => (m.id === replaceId ? answer : m));
      return [...prev, { id: newId(), role: "user", content: q }, answer];
    });

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamQuestion(
        documentId,
        q,
        {
          onSources: (sources) => {
            update(answerId, { sources, status: "streaming" });
            onSources(sources);
          },
          onToken: (t) => update(answerId, (m) => ({ content: m.content + t, status: "streaming" })),
        },
        ctrl.signal
      );
      update(answerId, { status: "done" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        update(answerId, (m) => ({ status: m.content ? "stopped" : "error", error: m.content ? undefined : "Stopped before an answer was written." }));
      } else if (err instanceof ApiError && err.status === 404) {
        onMissingDocument();
      } else {
        update(answerId, {
          status: "error",
          error: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
        });
      }
    } finally {
      abortRef.current = null;
    }
  }

  function submit() {
    const q = input;
    setInput("");
    if (textarea.current) textarea.current.style.height = "";
    ask(q);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 pt-6">
              <div>
                <p className="text-lg font-semibold">Ask anything about this document</p>
                <p className="mt-1 text-sm text-muted">Answers come only from this PDF, with the pages they used.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => ask(s)}
                    className="rounded-full border border-line bg-surface px-3.5 py-2 text-left text-[13px] text-ink/85 transition-colors hover:border-line-strong hover:bg-surface-2"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
              >
                {m.role === "user" ? (
                  <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-[14px_14px_4px_14px] bg-bubble px-3.5 py-2.5 text-[14.5px] leading-relaxed">
                    {m.content}
                  </div>
                ) : (
                  <AssistantMessage m={m} onCite={onCite} onRetry={(msg) => msg.question && ask(msg.question, msg.id)} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="border-t border-line bg-surface px-3 pb-3 pt-3 sm:px-5 sm:pb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-line-strong bg-bg py-1.5 pl-3.5 pr-1.5 focus-within:border-brand"
        >
          <label htmlFor="question" className="sr-only">Your question</label>
          <textarea
            id="question"
            ref={textarea}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask about this document…"
            className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-faint sm:text-[14.5px]"
          />
          {busy ? (
            <Button size="sm" onClick={() => abortRef.current?.abort()} className="!h-9">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-ink" aria-hidden="true" />
              Stop
            </Button>
          ) : (
            <IconButton
              label="Send question"
              type="submit"
              disabled={!input.trim()}
              className="!h-9 !w-9 bg-brand-solid !text-white hover:!bg-brand-solid hover:brightness-110 disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </IconButton>
          )}
        </form>
        <p className="mx-auto mt-2 max-w-2xl px-1 text-xs text-faint">
          Answers come only from this PDF. Check the cited pages for anything important.
        </p>
      </div>
    </div>
  );
}
