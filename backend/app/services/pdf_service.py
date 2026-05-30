"""
pdf_service.py
--------------
This is the "ingestion" half of a RAG (Retrieval-Augmented Generation) system.

RAG in one sentence:
  Instead of hoping the AI already knows your PDF, we FIND the most relevant
  pieces of your PDF and HAND them to the AI along with the question.

This file handles the steps that happen ONCE per uploaded PDF:

  1. EXTRACT  -> read raw text out of every page of the PDF
  2. CHUNK    -> cut that text into small overlapping pieces
  3. EMBED    -> turn each chunk into a list of numbers (a "vector")
                 that captures its meaning
  4. STORE    -> save those vectors in ChromaDB so we can search them later

Why chunk? Because PDFs are huge and AI models have limited input size.
Small chunks also make search more precise.

Why embed? Computers can't compare meaning of text directly, but they CAN
compare vectors. Similar meaning -> vectors that are close together.
"""

from __future__ import annotations

import os
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.services.vector_store import get_vector_store


def extract_pages(pdf_path: str) -> list[dict]:
    """
    STEP 1 — EXTRACT.
    Open the PDF and pull text out page by page.

    Returns a list like:
      [{"page": 1, "text": "..."}, {"page": 2, "text": "..."}, ...]

    We keep the page number so that later we can tell the user
    EXACTLY which page an answer came from (the "Sources" feature).
    """
    reader = PdfReader(pdf_path)
    pages: list[dict] = []

    for page_number, page in enumerate(reader.pages, start=1):
        # extract_text() can return None for image-only pages
        text = page.extract_text() or ""
        text = text.strip()
        if text:  # skip blank pages
            pages.append({"page": page_number, "text": text})

    return pages


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    STEP 2 — CHUNK.
    Break each page's text into smaller overlapping pieces.

    We use RecursiveCharacterTextSplitter, which tries to split on natural
    boundaries first (paragraphs, then sentences, then words) so chunks
    stay readable instead of cutting words in half.

    The OVERLAP means the end of one chunk repeats at the start of the next.
    This prevents losing context that sits right on a chunk boundary.

    Returns a list like:
      [{"text": "...", "page": 1, "chunk_index": 0}, ...]
    """
    settings = get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks: list[dict] = []
    chunk_index = 0

    for page in pages:
        for piece in splitter.split_text(page["text"]):
            piece = piece.strip()
            if not piece:
                continue
            chunks.append(
                {
                    "text": piece,
                    "page": page["page"],
                    "chunk_index": chunk_index,
                }
            )
            chunk_index += 1

    return chunks


def process_pdf(pdf_path: str, document_id: str) -> dict:
    """
    Run the full ingestion pipeline for one PDF and store it in ChromaDB.

    `document_id` tags every chunk so that, when the user later asks a
    question, we only search inside THIS document and not others.

    Returns a small summary used in the API response.
    """
    # 1 + 2: extract and chunk
    pages = extract_pages(pdf_path)
    if not pages:
        raise ValueError(
            "No extractable text found. The PDF may be scanned images. "
            "OCR is needed for those (out of scope for this beginner build)."
        )
    chunks = chunk_pages(pages)

    # 3 + 4: embed and store (handled inside the vector store wrapper)
    store = get_vector_store()
    store.add_chunks(document_id=document_id, chunks=chunks)

    return {
        "num_pages": len(pages),
        "num_chunks": len(chunks),
    }


def delete_pdf_file(pdf_path: str) -> None:
    """Best-effort cleanup of the raw uploaded file from disk."""
    try:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
    except OSError:
        pass
