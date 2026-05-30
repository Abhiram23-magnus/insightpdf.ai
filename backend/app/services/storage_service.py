"""
storage_service.py
------------------
A deliberately SIMPLE storage layer for two things:
  1. Document metadata (filename, page count, etc.)
  2. Chat history (every question/answer pair)

For a beginner project we avoid setting up a full SQL database and just use
two JSON files on disk. This keeps the focus on learning RAG. The functions
below are the only place that touches those files, so if you later upgrade to
SQLite or Postgres you only change THIS file.

NOTE ON CONCURRENCY: JSON files are fine for a single-user learning app.
For production with many simultaneous users, switch to a real database.
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone

from app.core.config import get_settings

# A lock so two requests don't corrupt the JSON files by writing at once.
_lock = threading.Lock()


def _data_dir() -> str:
    settings = get_settings()
    # Store the JSON files next to the chroma data.
    path = os.path.join(settings.chroma_dir, "_meta")
    os.makedirs(path, exist_ok=True)
    return path


def _docs_path() -> str:
    return os.path.join(_data_dir(), "documents.json")


def _history_path() -> str:
    return os.path.join(_data_dir(), "history.json")


def _read_json(path: str) -> list:
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_json(path: str, data: list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Documents ----------

def save_document(document_id: str, filename: str, num_pages: int, num_chunks: int) -> dict:
    record = {
        "document_id": document_id,
        "filename": filename,
        "num_pages": num_pages,
        "num_chunks": num_chunks,
        "created_at": _now_iso(),
    }
    with _lock:
        docs = _read_json(_docs_path())
        docs.append(record)
        _write_json(_docs_path(), docs)
    return record


def list_documents() -> list[dict]:
    return _read_json(_docs_path())


def get_document(document_id: str) -> dict | None:
    for d in _read_json(_docs_path()):
        if d["document_id"] == document_id:
            return d
    return None


# ---------- Chat history ----------

def save_history(document_id: str, question: str, answer: str, sources: list[dict]) -> dict:
    import uuid

    record = {
        "id": str(uuid.uuid4()),
        "document_id": document_id,
        "question": question,
        "answer": answer,
        "sources": sources,
        "created_at": _now_iso(),
    }
    with _lock:
        history = _read_json(_history_path())
        history.append(record)
        _write_json(_history_path(), history)
    return record


def list_history(document_id: str | None = None) -> list[dict]:
    history = _read_json(_history_path())
    if document_id:
        history = [h for h in history if h["document_id"] == document_id]
    return history
