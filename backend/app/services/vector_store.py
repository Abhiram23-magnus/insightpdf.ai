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

from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import get_settings


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

        self._db.add_texts(texts=texts, metadatas=metadatas, ids=ids)

    def search(self, document_id: str, query: str, top_k: int) -> list[dict]:
        """
        STEP (at question time) — RETRIEVE.
        Find the `top_k` chunks most relevant to `query`, but ONLY within
        the requested document (using a metadata filter).

        Returns a list of dicts with the text + its metadata.
        """
        results = self._db.similarity_search(
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
