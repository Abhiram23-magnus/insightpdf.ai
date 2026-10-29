"""
storage_service.py
------------------
Documents, chat history and the original PDF files, stored on Supabase.

  documents  (Postgres table)  one row per uploaded PDF
  messages   (Postgres table)  every question/answer pair, per document
  pdfs       (private bucket)  the original file at {user_id}/{document_id}/original.pdf

Every function takes the signed-in user's token, so Postgres row-level
security and the bucket policies only ever let a user touch their own data.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services import supabase_client as sb


def storage_path(user_id: str, document_id: str) -> str:
    return f"{user_id}/{document_id}/original.pdf"


def _doc_out(row: dict) -> dict:
    return {
        "document_id": row["id"],
        "filename": row["filename"],
        "num_pages": row.get("page_count") or 0,
        "num_chunks": row.get("chunk_count") or 0,
        "file_size_bytes": row.get("file_size_bytes") or 0,
        "status": row.get("status") or "ready",
        "created_at": row["created_at"],
    }


# ---------- Documents ----------

def create_document(
    token: str, user_id: str, document_id: str, filename: str, size: int, checksum: str
) -> dict:
    rows = sb.insert(
        token,
        "documents",
        {
            "id": document_id,
            "user_id": user_id,
            "filename": filename[:255],
            "storage_path": storage_path(user_id, document_id),
            "file_size_bytes": size,
            "checksum": checksum,
            "status": "processing",
        },
    )
    return rows[0]


def mark_ready(token: str, document_id: str, num_pages: int, num_chunks: int) -> None:
    sb.update(
        token,
        "documents",
        {"id": f"eq.{document_id}"},
        {
            "status": "ready",
            "page_count": num_pages,
            "chunk_count": num_chunks,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "error": None,
        },
    )


STALE_MINUTES = 20


def purge_stale(token: str) -> None:
    """
    Remove this user's uploads that never finished processing (the server
    restarted or the request died midway), so they don't count against limits.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=STALE_MINUTES)).isoformat()
    try:
        rows = sb.select(
            token,
            "documents",
            {"select": "id,storage_path", "status": "neq.ready", "created_at": f"lt.{cutoff}"},
        )
        for row in rows:
            try:
                sb.remove_object(token, row["storage_path"])
            except sb.SupabaseError:
                pass
            sb.delete(token, "documents", {"id": f"eq.{row['id']}"})
    except sb.SupabaseError:
        pass


def count_documents(token: str) -> int:
    return len(sb.select(token, "documents", {"select": "id"}))


def find_by_checksum(token: str, checksum: str) -> dict | None:
    rows = sb.select(
        token,
        "documents",
        {"select": "*", "checksum": f"eq.{checksum}", "status": "eq.ready", "limit": "1"},
    )
    return _doc_out(rows[0]) if rows else None


def list_documents(token: str) -> list[dict]:
    purge_stale(token)
    rows = sb.select(
        token,
        "documents",
        {"select": "*", "status": "eq.ready", "order": "created_at.desc"},
    )
    return [_doc_out(r) for r in rows]


def get_document(token: str, document_id: str) -> dict | None:
    rows = sb.select(token, "documents", {"select": "*", "id": f"eq.{document_id}", "limit": "1"})
    return rows[0] if rows else None


def delete_document(token: str, document_id: str) -> bool:
    """Remove the file, then the row (passages and chat history cascade with it)."""
    row = get_document(token, document_id)
    if row is None:
        return False
    try:
        sb.remove_object(token, row["storage_path"])
    except sb.SupabaseError:
        pass  # the row below is what makes the document reachable; remove it regardless
    sb.delete(token, "documents", {"id": f"eq.{document_id}"})
    return True


def storage_used(token: str) -> int:
    try:
        return int(sb.rpc(token, "my_storage_bytes", {}) or 0)
    except (sb.SupabaseError, TypeError, ValueError):
        return 0


# ---------- Files ----------

def upload_pdf(token: str, user_id: str, document_id: str, data: bytes) -> None:
    sb.upload_object(token, storage_path(user_id, document_id), data, "application/pdf")


def file_url(token: str, document: dict) -> str:
    return sb.signed_url(token, document["storage_path"], expires_in=3600)


# ---------- Chat history ----------

def save_history(
    token: str, user_id: str, document_id: str, question: str, answer: str, sources: list[dict]
) -> dict:
    rows = sb.insert(
        token,
        "messages",
        {
            "document_id": document_id,
            "user_id": user_id,
            "question": question,
            "answer": answer,
            "sources": sources,
        },
    )
    return rows[0]


def list_history(token: str, document_id: str | None = None) -> list[dict]:
    params = {"select": "*", "order": "created_at.asc"}
    if document_id:
        params["document_id"] = f"eq.{document_id}"
    return sb.select(token, "messages", params)
