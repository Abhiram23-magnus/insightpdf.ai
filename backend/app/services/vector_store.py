"""
vector_store.py
---------------
Embeddings (Google Gemini) + vector search (Postgres pgvector on Supabase).

WHAT ARE EMBEDDINGS?
  A function that turns text into a fixed-length list of numbers (a vector).
  Text with similar meaning produces vectors that are near each other.
  We ask Gemini for 768-number vectors, matching the `vector(768)` column.

WHERE DO THEY LIVE?
  In the `chunks` table on Supabase, next to the passage text and its page.
  Every row is owned by one user and protected by row-level security, and
  search runs through the `match_chunks` database function as that user,
  so a search can only ever see the caller's own passages.
"""

from __future__ import annotations

import logging
import re
import time

from google import genai
from google.genai.types import HttpOptions
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import get_settings
from app.services import supabase_client

log = logging.getLogger("uvicorn.error")

# --- Gemini free-tier rate limiting -----------------------------------------
# The free tier allows ~100 embedding requests per MINUTE. A big PDF can have
# hundreds of chunks, so sending them all at once fails with
# "429 RESOURCE_EXHAUSTED". We therefore:
#   1. send chunks in batches that stay under the per-minute limit, and
#   2. if Google still says "slow down", wait the time it asks for and retry.
EMBED_BATCH_SIZE = 80      # chunks per batch (under the 100/min limit)
RATE_WINDOW_SECONDS = 61   # one batch per window
MAX_RETRIES = 5
INSERT_BATCH_SIZE = 100    # rows per insert request to Postgres
GEMINI_TIMEOUT_MS = 60_000 # never wait on a single Gemini call longer than this


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


MAX_WAIT_SECONDS = 90  # longer than this means a daily quota, not a per-minute one


class QuotaExhausted(Exception):
    """Gemini's free daily quota is used up; waiting won't help today."""

    def __init__(self, retry_after: float):
        self.retry_after = retry_after
        super().__init__(f"RESOURCE_EXHAUSTED: daily quota, retry in {retry_after:.0f}s")

    def friendly(self) -> str:
        hours = self.retry_after / 3600
        when = f"about {hours:.0f} hours" if hours >= 1.5 else "about an hour" if hours >= 0.75 else "a few minutes"
        return (
            "Today's free Gemini AI quota is used up, so new PDFs and questions can't be "
            f"processed right now. It resets in {when}."
        )


def friendly_ai_error(exc: Exception, fallback: str) -> str:
    if isinstance(exc, QuotaExhausted):
        return exc.friendly()
    text = str(exc)
    if "RESOURCE_EXHAUSTED" in text or "429" in text:
        return "The free AI quota is busy right now. Wait a minute and try again."
    return fallback


def with_rate_limit_retry(fn, *args, **kwargs):
    """Call fn, waiting and retrying when Gemini returns a 429."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            if not _is_rate_limit(exc) or attempt == MAX_RETRIES:
                raise
            delay = _retry_delay(exc, attempt)
            if delay > MAX_WAIT_SECONDS:
                log.warning("Gemini daily quota exhausted; retry after %.0fs", delay)
                raise QuotaExhausted(delay) from exc
            log.warning("Gemini rate limit (attempt %d); waiting %.0fs", attempt + 1, delay)
            time.sleep(delay)


_embeddings: GoogleGenerativeAIEmbeddings | None = None


def _embedder() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        settings = get_settings()
        emb = GoogleGenerativeAIEmbeddings(
            model=settings.gemini_embed_model,
            google_api_key=settings.google_api_key,
        )
        # The default client has no request timeout, so a stalled connection
        # could hang an upload forever. Give it one.
        emb.client = genai.Client(
            api_key=settings.google_api_key,
            http_options=HttpOptions(timeout=GEMINI_TIMEOUT_MS),
        )
        _embeddings = emb
    return _embeddings


def _vector_literal(values: list[float]) -> str:
    """pgvector accepts vectors as text like '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{v:.7g}" for v in values) + "]"


def embed_query(text: str) -> list[float]:
    dims = get_settings().embed_dimensions
    return with_rate_limit_retry(_embedder().embed_query, text, output_dimensionality=dims)


def add_chunks(token: str, user_id: str, document_id: str, chunks: list[dict]) -> None:
    """Embed every chunk (rate-limited) and store it in the `chunks` table."""
    dims = get_settings().embed_dimensions
    texts = [c["text"] for c in chunks]

    for start in range(0, len(texts), EMBED_BATCH_SIZE):
        batch_started = time.monotonic()
        end = start + EMBED_BATCH_SIZE
        vectors = with_rate_limit_retry(
            _embedder().embed_documents, texts[start:end], output_dimensionality=dims
        )
        rows = [
            {
                "document_id": document_id,
                "user_id": user_id,
                "page": c["page"],
                "chunk_index": c["chunk_index"],
                "content": c["text"],
                "embedding": _vector_literal(v),
            }
            for c, v in zip(chunks[start:end], vectors)
        ]
        for i in range(0, len(rows), INSERT_BATCH_SIZE):
            supabase_client.insert(token, "chunks", rows[i : i + INSERT_BATCH_SIZE], returning=False)

        # If more batches remain, wait out the rest of the minute.
        if end < len(texts):
            elapsed = time.monotonic() - batch_started
            if elapsed < RATE_WINDOW_SECONDS:
                time.sleep(RATE_WINDOW_SECONDS - elapsed)


def search(token: str, document_id: str, query: str, top_k: int) -> list[dict]:
    """
    RETRIEVE: the `top_k` passages closest in meaning to `query`, only within
    this document (and, through row-level security, only the caller's own).
    """
    vector = embed_query(query)
    rows = supabase_client.rpc(
        token,
        "match_chunks",
        {"p_document_id": document_id, "p_query": _vector_literal(vector), "p_k": top_k},
    )
    return [
        {"text": r["content"], "page": r["page"], "chunk_index": r["chunk_index"]}
        for r in rows
    ]
