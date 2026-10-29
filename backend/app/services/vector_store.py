"""
vector_store.py
---------------
A thin wrapper around ChromaDB + Google Gemini embeddings.

WHAT IS CHROMADB?
  A "vector database". A normal database searches by exact match
  (WHERE name = 'Bob'). A vector database searches by MEANING / similarity.
  You give it a question vector and it returns the chunks whose vectors are
  closest — i.e. the most semantically relevant pieces of your PDF.

WHAT ARE EMBEDDINGS?
  A function that turns text into a fixed-length list of numbers (a vector).
  Google's text-embedding-004 model does this for us. Text with similar
  meaning produces vectors that are near each other in space.

We persist Chroma to disk (CHROMA_DIR) so your data survives server restarts.
"""

from __future__ import annotations

import re
import time

from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import get_settings


# --- Gemini free-tier rate limiting -----------------------------------------
# The free tier allows ~100 embedding requests per MINUTE. A big PDF can have
# hundreds of chunks, so sending them all at once fails with
# "429 RESOURCE_EXHAUSTED". We therefore:
#   1. send chunks in batches that stay under the per-minute limit, and
#   2. if Google still says "slow down", wait the time it asks for and retry.
EMBED_BATCH_SIZE = 80      # chunks per batch (under the 100/min limit)
RATE_WINDOW_SECONDS = 61   # one batch per window
MAX_RETRIES = 5


def _is_rate_limit(exc: Exception) -> bool:
    text = str(exc)
    return "RESOURCE_EXHAUSTED" in text or "429" in text


def _retry_delay(exc: Exception, attempt: int) -> float:
    """Use the delay Google suggests ('retry in 29.8s'), else back off."""
    match = re.search(r"retry in ([\d.]+)s", str(exc)) or re.search(
        r"retryDelay'?:\s*'?(\d+)s", str(exc)
    )
    if match:
        return float(match.group(1)) + 2
    return min(15 * (attempt + 1), 65)


def with_rate_limit_retry(fn, *args, **kwargs):
    """Call fn, waiting and retrying when Gemini returns a 429."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            if not _is_rate_limit(exc) or attempt == MAX_RETRIES:
                raise
            time.sleep(_retry_delay(exc, attempt))


class VectorStore:
    """Handles embedding + storing + searching document chunks."""

    COLLECTION_NAME = "insightpdf_documents"

    def __init__(self) -> None:
        settings = get_settings()

        # The embedding model. LangChain calls Gemini for us under the hood.
        self._embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.gemini_embed_model,
            google_api_key=settings.google_api_key,
        )

        # The Chroma client, pointed at a folder on disk.
        self._db = Chroma(
            collection_name=self.COLLECTION_NAME,
            embedding_function=self._embeddings,
            persist_directory=settings.chroma_dir,
        )

    def add_chunks(self, document_id: str, chunks: list[dict]) -> None:
        """
        Embed every chunk and store it.

        We attach METADATA to each chunk:
          - document_id : which PDF it belongs to (lets us filter searches)
          - page        : page number (for the Sources panel)
          - chunk_index : ordering within the document
        """
        texts = [c["text"] for c in chunks]
        metadatas = [
            {
                "document_id": document_id,
                "page": c["page"],
                "chunk_index": c["chunk_index"],
            }
            for c in chunks
        ]
        # Stable IDs prevent duplicates if the same doc is processed twice.
        ids = [f"{document_id}-{c['chunk_index']}" for c in chunks]

        # Embed + store in rate-limited batches (see note at top of file).
        for start in range(0, len(texts), EMBED_BATCH_SIZE):
            batch_started = time.monotonic()
            end = start + EMBED_BATCH_SIZE
            with_rate_limit_retry(
                self._db.add_texts,
                texts=texts[start:end],
                metadatas=metadatas[start:end],
                ids=ids[start:end],
            )
            # If more batches remain, wait out the rest of the minute.
            if end < len(texts):
                elapsed = time.monotonic() - batch_started
                if elapsed < RATE_WINDOW_SECONDS:
                    time.sleep(RATE_WINDOW_SECONDS - elapsed)

    def search(self, document_id: str, query: str, top_k: int) -> list[dict]:
        """
        STEP (at question time) — RETRIEVE.
        Find the `top_k` chunks most relevant to `query`, but ONLY within
        the requested document (using a metadata filter).

        Returns a list of dicts with the text + its metadata.
        """
        results = with_rate_limit_retry(
            self._db.similarity_search,
            query=query,
            k=top_k,
            filter={"document_id": document_id},
        )

        return [
            {
                "text": doc.page_content,
                "page": doc.metadata.get("page", 0),
                "chunk_index": doc.metadata.get("chunk_index", 0),
            }
            for doc in results
        ]

    def delete_document(self, document_id: str) -> None:
        """Remove all chunks belonging to one document."""
        self._db.delete(where={"document_id": document_id})


# --- Singleton accessor ---
# Building the embeddings client + Chroma connection is relatively expensive,
# so we create ONE instance and reuse it across requests.
_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store
