"use client";

// Drag-and-drop + click-to-browse area for one or many PDFs.
import { motion } from "motion/react";
import { useRef, useState } from "react";

export default function Dropzone({
  onFiles,
  maxMb,
  compact = false,
}: {
  onFiles: (files: FileList) => void;
  maxMb: number;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <motion.div
      animate={{ scale: over ? 1.01 : 1 }}
      transition={{ duration: 0.15 }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
      className={`relative rounded-2xl border-2 border-dashed transition-colors ${
        over ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        id="pdf-input"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = ""; // allow picking the same file again
        }}
      />
      <label
        htmlFor="pdf-input"
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 text-center ${
          compact ? "px-6 py-6 sm:flex-row sm:gap-4 sm:text-left" : "px-6 py-14"
        }`}
      >
        <span className={`grid shrink-0 place-items-center rounded-xl bg-brand-soft text-brand ${compact ? "h-11 w-11" : "h-14 w-14"}`}>
          <svg width={compact ? 20 : 26} height={compact ? 20 : 26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
          </svg>
        </span>
        <span className="flex flex-col gap-1">
          <span className={`font-medium ${compact ? "text-[15px]" : "text-lg"}`}>
            {over ? "Drop to upload" : "Drop PDFs here, or click to browse"}
          </span>
          <span className="text-[13px] text-muted">
            Several files at once is fine · up to {maxMb} MB each · text-based PDFs work best
          </span>
        </span>
      </label>
    </motion.div>
  );
}
