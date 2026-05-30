"""
schemas.py
----------
These classes describe the SHAPE of the data going in and out of our API.

FastAPI uses them to:
  1. Validate incoming requests (reject bad data automatically)
  2. Serialize outgoing responses (turn Python objects into JSON)
  3. Auto-generate interactive docs at /docs
"""

from pydantic import BaseModel, Field


# ---------- Upload ----------

class UploadResponse(BaseModel):
    """Returned after a PDF is successfully uploaded and processed."""
    document_id: str = Field(..., description="Unique ID for this document")
    filename: str
    num_pages: int
    num_chunks: int
    message: str


# ---------- Chat ----------

class ChatRequest(BaseModel):
    """What the frontend sends when the user asks a question."""
    document_id: str = Field(..., description="Which document to ask about")
    question: str = Field(..., min_length=1, description="The user's question")


class Source(BaseModel):
    """One piece of source text that supported the answer."""
    page: int = Field(..., description="PDF page number this chunk came from")
    chunk_index: int = Field(..., description="Position of the chunk in the doc")
    snippet: str = Field(..., description="A short preview of the chunk text")


class ChatResponse(BaseModel):
    """The AI's answer plus the sources it used."""
    answer: str
    sources: list[Source]


# ---------- Chat history ----------

class HistoryItem(BaseModel):
    """A single stored question/answer pair."""
    id: str
    document_id: str
    question: str
    answer: str
    sources: list[Source]
    created_at: str  # ISO timestamp


class HistoryResponse(BaseModel):
    items: list[HistoryItem]


# ---------- Documents list ----------

class DocumentItem(BaseModel):
    document_id: str
    filename: str
    num_pages: int
    num_chunks: int
    created_at: str


class DocumentsResponse(BaseModel):
    items: list[DocumentItem]
