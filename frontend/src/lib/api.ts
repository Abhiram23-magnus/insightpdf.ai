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

// Read the backend URL from the environment (set in .env.local / Vercel).
// Strip any trailing slash so we never build URLs like "...com//api/chat".
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

// Error thrown for API failures. `status` lets callers react to specific
// cases (e.g. 404 = document no longer exists on the server).
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// fetch() wrapper: turns network failures (server asleep/offline, CORS)
// into a readable message instead of the browser's "Failed to fetch".
async function request(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError(
      "Can't reach the server. It may be waking up — wait a few seconds and try again.",
      0
    );
  }
}

// Turns non-2xx responses into thrown errors with the backend's friendly
// "detail" message when available.
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (Array.isArray(body?.detail) && body.detail[0]?.msg)
        detail = body.detail[0].msg; // FastAPI validation errors
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

// Ping the backend so a sleeping free-tier server starts waking up while
// the user is still choosing a file. Errors are ignored on purpose.
export function wakeBackend(): void {
  fetch(`${API_URL}/`).catch(() => {});
}

// Upload a single PDF. Uses FormData because we're sending a file.
export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await request(`${API_URL}/api/upload`, {
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
  const res = await request(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, question }),
  });
  return handle<ChatResponse>(res);
}

// List all processed documents.
export async function listDocuments(): Promise<DocumentItem[]> {
  const res = await request(`${API_URL}/api/documents`);
  const data = await handle<{ items: DocumentItem[] }>(res);
  return data.items;
}

// Fetch chat history, optionally filtered to one document.
export async function getHistory(documentId?: string): Promise<HistoryItem[]> {
  const query = documentId
    ? `?document_id=${encodeURIComponent(documentId)}`
    : "";
  const res = await request(`${API_URL}/api/history${query}`);
  const data = await handle<{ items: HistoryItem[] }>(res);
  return data.items;
}

// The PDF file is served by the backend for the viewer iframe.
export function pdfFileUrl(documentId: string): string {
  return `${API_URL}/api/file/${encodeURIComponent(documentId)}`;
}
