"use client";

// The landing page's one signature moment: a question is asked, the answer
// writes itself, and the passage it came from lights up on the page while
// the matching "p. 14" chip pulses. Pure decoration — aria-hidden.

import { motion } from "motion/react";

const ANSWER =
  "Margin rose mainly because logistics costs fell after the warehouse consolidation, while revenue held steady.";
const WORDS = ANSWER.split(" ");
const START = 0.9; // seconds before the answer starts writing
const PER_WORD = 0.045;
const DONE = START + WORDS.length * PER_WORD;

function Bar({ w, head = false }: { w: string; head?: boolean }) {
  return <div className={`rounded ${head ? "h-2.5 bg-faint/50" : "h-1.5 bg-line"}`} style={{ width: w }} />;
}

export default function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_60px_-30px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
        <span className="text-[13px] font-medium">Annual-Report-2025.pdf</span>
        <span className="ml-auto font-mono text-xs text-faint">p. 14 / 48</span>
      </div>

      <div className="flex flex-wrap">
        {/* Page */}
        <div className="flex-[1_1_230px] border-r border-line bg-surface-2/40 p-5">
          <div className="flex flex-col gap-2.5 rounded-md bg-bg/60 p-5">
            <Bar w="55%" head />
            <Bar w="100%" />
            <Bar w="92%" />
            <div className="relative -mx-1.5 flex flex-col gap-2 p-1.5">
              <motion.div
                className="absolute inset-0 origin-left rounded border-l-2 border-cite bg-cite-soft"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: DONE - 0.2, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
              />
              <div className="relative h-1.5 w-full rounded bg-cite/70" />
              <div className="relative h-1.5 w-[78%] rounded bg-cite/70" />
            </div>
            <Bar w="96%" />
            <Bar w="70%" />
            <Bar w="88%" />
            <Bar w="60%" />
          </div>
        </div>

        {/* Chat */}
        <div className="flex min-h-[260px] flex-[1_1_300px] flex-col gap-3.5 p-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.35 }}
            className="max-w-[85%] self-end rounded-[12px_12px_4px_12px] bg-bubble px-3.5 py-2.5 text-sm"
          >
            What drove the rise in operating margin?
          </motion.div>
          <div className="flex items-start gap-2.5">
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#818CF8] to-[#A78BFA]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B1020" strokeWidth="2.6" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>
            </span>
            <p className="text-sm leading-relaxed text-ink/85">
              {WORDS.map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: START + i * PER_WORD, duration: 0.15 }}
                >
                  {w}{" "}
                </motion.span>
              ))}
              <motion.span
                className="ml-1 inline-flex rounded-md border border-[color-mix(in_srgb,var(--cite)_40%,transparent)] bg-cite-soft px-1.5 font-mono text-xs text-cite"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  boxShadow: [
                    "0 0 0 0 rgba(34,211,238,0)",
                    "0 0 0 4px rgba(34,211,238,0.2)",
                    "0 0 0 0 rgba(34,211,238,0)",
                  ],
                }}
                transition={{
                  opacity: { delay: DONE, duration: 0.2 },
                  scale: { delay: DONE, duration: 0.2 },
                  boxShadow: { delay: DONE + 0.4, duration: 2.4, repeat: Infinity },
                }}
              >
                p. 14
              </motion.span>{" "}
              <motion.span
                className="inline-flex rounded-md border border-[color-mix(in_srgb,var(--brand)_30%,transparent)] bg-brand-soft px-1.5 font-mono text-xs text-brand"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: DONE + 0.1, duration: 0.2 }}
              >
                p. 31
              </motion.span>
            </p>
          </div>
          <div className="mt-auto flex items-center gap-2 rounded-xl border border-line bg-bg/50 py-2 pl-3.5 pr-2">
            <span className="flex-1 text-[13px] text-faint">
              Ask about this document<span className="animate-blink text-brand">|</span>
            </span>
            <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-brand-solid">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
