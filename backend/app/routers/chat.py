"""
chat.py (router)
----------------
Endpoints for asking questions and reading past Q&A.

POST /api/chat            -> ask a question about a document
GET  /api/history         -> get chat history (optionally per-document)
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    Source,
    HistoryResponse,
    HistoryItem,
)
from app.services import chat_service, storage_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Answer a question about a previously uploaded document, then store
    the exchange in chat history.
    """
    # Make sure the document actually exists before we try to search it.
    doc = storage_service.get_document(request.document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        result = chat_service.answer_question(
            document_id=request.document_id,
            question=request.question,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"AI error: {exc}")

    # Persist this Q&A so the history panel can show it later.
    storage_service.save_history(
        document_id=request.document_id,
        question=request.question,
        answer=result["answer"],
        sources=result["sources"],
    )

    return ChatResponse(
        answer=result["answer"],
        sources=[Source(**s) for s in result["sources"]],
    )


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    document_id: str | None = Query(default=None, description="Filter by document"),
) -> HistoryResponse:
    history = storage_service.list_history(document_id=document_id)
    items = [
        HistoryItem(
            id=h["id"],
            document_id=h["document_id"],
            question=h["question"],
            answer=h["answer"],
            sources=[Source(**s) for s in h["sources"]],
            created_at=h["created_at"],
        )
        for h in history
    ]
    return HistoryResponse(items=items)
