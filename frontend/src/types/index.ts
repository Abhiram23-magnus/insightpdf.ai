// Mirrors the backend's Pydantic schemas.

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

export interface DocumentItem {
  document_id: string;
  filename: string;
  num_pages: number;
  num_chunks: number;
  file_size_bytes?: number;
  created_at: string;
}

export interface Limits {
  max_upload_mb: number;
  max_documents: number;
  storage_used_bytes: number;
}

export interface HistoryItem {
  id: string;
  document_id: string;
  question: string;
  answer: string;
  sources: Source[];
  created_at: string;
}

// A message in the chat UI.
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  status?: "searching" | "streaming" | "done" | "error" | "stopped";
  error?: string;
  question?: string; // on assistant messages: the question, for Retry
}
