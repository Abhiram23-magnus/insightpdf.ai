// types/index.ts
// These TypeScript interfaces mirror the Pydantic schemas on the backend.
// Keeping them in sync means the editor catches mistakes before runtime.

export interface Source {
  page: number;
  chunk_index: number;
  snippet: string;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  num_pages: number;
  num_chunks: number;
  message: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

// A message shown in the chat UI (user or assistant).
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export interface DocumentItem {
  document_id: string;
  filename: string;
  num_pages: number;
  num_chunks: number;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  document_id: string;
  question: string;
  answer: string;
  sources: Source[];
  created_at: string;
}
