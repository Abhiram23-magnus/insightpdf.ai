// lib/api.ts — every network call to the backend lives here.

import type { ChatResponse, DocumentItem, HistoryItem, Source, UploadResponse } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const OFFLINE =
  "Can't reach the server. It may be waking up — wait a few seconds and try again.";

async function request(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(OFFLINE, 0);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    /* not JSON */
  }
  return `Request failed (${res.status})`;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return res.json() as Promise<T>;
}

/** Ping the backend so a sleeping free-tier server starts waking up early. */
export function wakeBackend(): void {
  fetch(`${API_URL}/`).catch(() => {});
}

export async function getLimits(): Promise<{ max_upload_mb: number }> {
  return handle(await request(`${API_URL}/api/limits`));
}

// ---------- Upload with real progress + cancel ----------

export interface UploadHandle {
  promise: Promise<UploadResponse>;
  cancel: () => void;
}

/**
 * Uploads one PDF. `onProgress(0..1)` reports bytes sent; `onSent` fires when
 * the file is fully uploaded and the server starts reading/indexing it.
 * fetch() can't report upload progress, so this uses XMLHttpRequest.
 */
export function uploadPdf(
  file: File,
  onProgress?: (fraction: number) => void,
  onSent?: () => void
): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<UploadResponse>((resolve, reject) => {
    xhr.open("POST", `${API_URL}/api/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.upload.onload = () => onSent?.();
    xhr.onload = () => {
      let body: { detail?: unknown } & Partial<UploadResponse> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadResponse);
      else
        reject(
          new ApiError(
            typeof body.detail === "string" ? body.detail : `Upload failed (${xhr.status})`,
            xhr.status
          )
        );
    };
    xhr.onerror = () => reject(new ApiError(OFFLINE, 0));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
  return { promise, cancel: () => xhr.abort() };
}

// ---------- Documents ----------

export async function listDocuments(signal?: AbortSignal): Promise<DocumentItem[]> {
  const data = await handle<{ items: DocumentItem[] }>(
    await request(`${API_URL}/api/documents`, { signal })
  );
  return data.items;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await handle(
    await request(`${API_URL}/api/documents/${encodeURIComponent(documentId)}`, {
      method: "DELETE",
    })
  );
}

export function pdfFileUrl(documentId: string): string {
  return `${API_URL}/api/file/${encodeURIComponent(documentId)}`;
}

// ---------- Chat ----------

export async function getHistory(documentId: string, signal?: AbortSignal): Promise<HistoryItem[]> {
  const data = await handle<{ items: HistoryItem[] }>(
    await request(`${API_URL}/api/history?document_id=${encodeURIComponent(documentId)}`, {
      signal,
    })
  );
  return data.items;
}

/** Non-streaming fallback. */
export async function askQuestion(documentId: string, question: string): Promise<ChatResponse> {
  return handle(
    await request(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId, question }),
    })
  );
}

export interface StreamHandlers {
  onSources: (sources: Source[]) => void;
  onToken: (text: string) => void;
}

/**
 * Streams an answer over Server-Sent Events. Resolves with the full answer
 * when the server sends `done`; rejects with ApiError on failure, or with an
 * AbortError if `signal` is aborted (the Stop button).
 */
export async function streamQuestion(
  documentId: string,
  question: string,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<string> {
  const res = await request(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ document_id: documentId, question }),
    signal,
  });
  if (!res.ok || !res.body) throw new ApiError(await readError(res), res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by a blank line.
    let split: number;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      let event = "message";
      let data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      const payload = JSON.parse(data);
      if (event === "sources") handlers.onSources(payload as Source[]);
      else if (event === "token") {
        answer += payload as string;
        handlers.onToken(payload as string);
      } else if (event === "error") throw new ApiError(payload.message, 500);
      else if (event === "done") return (payload.answer as string) || answer;
    }
  }
  if (!answer) throw new ApiError("The answer was cut off. Please try again.", 0);
  return answer;
}
