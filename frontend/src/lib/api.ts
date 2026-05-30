// lib/api.ts
// One place for every network call to the backend. Components never call
// fetch() directly — they call these functions. If the API ever changes,
// you only edit this file.

import type {
  UploadResponse,
  ChatResponse,
  DocumentItem,
  HistoryItem,
} from "@/types";

// Read the backend URL from the environment (set in .env.local).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// A small helper that turns non-2xx responses into thrown errors with
// the backend's friendly "detail" message when available.
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// Upload a single PDF. Uses FormData because we're sending a file.
export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });
  return handle<UploadResponse>(res);
}

// Ask a question about a document.
export async function askQuestion(
  documentId: string,
  question: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, question }),
  });
  return handle<ChatResponse>(res);
}

// List all processed documents.
export async function listDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(`${API_URL}/api/documents`);
  const data = await handle<{ items: DocumentItem[] }>(res);
  return data.items;
}

// Fetch chat history, optionally filtered to one document.
export async function getHistory(documentId?: string): Promise<HistoryItem[]> {
  const url = new URL(`${API_URL}/api/history`);
  if (documentId) url.searchParams.set("document_id", documentId);
  const res = await fetch(url.toString());
  const data = await handle<{ items: HistoryItem[] }>(res);
  return data.items;
}

// The PDF file is served by the backend for the viewer iframe.
export function pdfFileUrl(documentId: string): string {
  return `${API_URL}/api/file/${documentId}`;
}
