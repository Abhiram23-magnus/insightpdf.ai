// lib/api.ts — every network call to the backend lives here.

import type { ChatResponse, DocumentItem, HistoryItem, Limits, Source, UploadResponse } from "@/types";
import { accessToken, supabase } from "@/lib/supabase";

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

const SIGNED_OUT = "Your session has ended. Please sign in again.";

/** Every API call carries the signed-in user's token; the server checks it. */
async function authHeader(): Promise<Record<string, string>> {
  const token = await accessToken();
  if (!token) throw new ApiError(SIGNED_OUT, 401);
  return { Authorization: `Bearer ${token}` };
}

/** A 401 means the session is gone (expired, or signed out elsewhere). */
function onUnauthorized() {
  supabase().auth.signOut().catch(() => {});
}

async function request(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = { ...(init.headers as Record<string, string> | undefined), ...(await authHeader()) };
  let res: Response;
  try {
    res = await fetch(input, { ...init, headers });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(OFFLINE, 0);
  }
  if (res.status === 401) onUnauthorized();
  return res;
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

export async function getLimits(): Promise<Limits> {
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
  let cancelled = false;
  const promise = new Promise<UploadResponse>(async (resolve, reject) => {
    let token: string | null = null;
    try {
      token = await accessToken();
    } catch {
      /* handled below */
    }
    if (!token) return reject(new ApiError(SIGNED_OUT, 401));
    if (cancelled) return reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.open("POST", `${API_URL}/api/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
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
      if (xhr.status === 401) onUnauthorized();
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
  return {
    promise,
    cancel: () => {
      cancelled = true;
      xhr.abort();
    },
  };
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

/**
 * A private, temporary (1 hour) link to the original PDF. The viewer is an
 * <iframe>, which can't send the sign-in header, so the server signs a link.
 */
export async function getPdfUrl(documentId: string, signal?: AbortSignal): Promise<string> {
  const data = await handle<{ url: string }>(
    await request(`${API_URL}/api/file/${encodeURIComponent(documentId)}`, { signal })
  );
  return data.url;
}

/** Opens the original PDF in a new tab (the tab is opened first so pop-up blockers allow it). */
export async function openPdf(documentId: string, page?: number): Promise<void> {
  const win = window.open("", "_blank");
  try {
    const url = await getPdfUrl(documentId);
    const target = page ? `${url}#page=${page}` : url;
    if (win) win.location.href = target;
    else window.location.href = target;
  } catch (err) {
    win?.close();
    throw err;
  }
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
