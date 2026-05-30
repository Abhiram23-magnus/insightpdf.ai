// components/UploadCard.tsx
"use client";

// A drag-and-drop (and click-to-browse) PDF uploader.
// On success it calls onUploaded() with the new document_id so the parent
// can navigate to the chat page.

import { useRef, useState } from "react";
import { FileUp, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { uploadPdf } from "@/lib/api";
import type { UploadResponse } from "@/types";

interface Props {
  onUploaded: (doc: UploadResponse) => void;
}

export default function UploadCard({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    setFileName(file.name);
    setUploading(true);
    try {
      const result = await uploadPdf(file);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="w-full">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
          dragging
            ? "border-[var(--accent)] bg-[var(--surface-2)] scale-[1.01]"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--accent)] transition-transform duration-300 group-hover:scale-110">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : fileName ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <FileUp className="h-8 w-8" />
          )}
        </div>

        {uploading ? (
          <div>
            <p className="text-lg font-medium">Processing your PDF…</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Extracting text, chunking, and building embeddings.
            </p>
          </div>
        ) : fileName ? (
          <div className="flex items-center gap-2 text-[var(--text)]">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{fileName}</span>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium">
              Drop a PDF here, or click to browse
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Single PDF · text-based documents work best
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-500 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
