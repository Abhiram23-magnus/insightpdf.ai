// components/PdfViewer.tsx
"use client";

// Displays the uploaded PDF using the browser's built-in PDF renderer
// via an <iframe>. The file is served by the backend at /api/file/{id}.
// This keeps things simple — no heavy PDF.js setup needed for a beginner build.

import { pdfFileUrl } from "@/lib/api";

interface Props {
  documentId: string;
  fileName: string;
}

export default function PdfViewer({ documentId, fileName }: Props) {
  return (
    <div className="flex h-full flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <span className="truncate font-display text-lg font-semibold">
          {fileName}
        </span>
      </div>
      <div className="flex-1 overflow-hidden bg-[var(--surface-2)]">
        <iframe
          src={pdfFileUrl(documentId)}
          title={fileName}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
