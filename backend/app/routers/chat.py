"""
chat.py (router)
----------------
Endpoints for asking questions and reading past Q&A. All require sign-in.

POST /api/chat            -> ask a question about a document
POST /api/chat/stream     -> same, streamed as Server-Sent Events
GET  /api/history         -> the signed-in user's chat history (optionally per-document)
"""

from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.core.auth import CurrentUser, current_user
from app.models.schemas import ChatRequest, ChatResponse, HistoryItem, HistoryResponse, Source
from app.services import chat_service, storage_service
from app.services.vector_store import friendly_ai_error

router = APIRouter(prefix="/api", tags=["chat"])


def _require_ready_document(token: str, document_id: str) -> dict:
    try:
        uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc = storage_service.get_document(token, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.get("status") != "ready":
        raise HTTPException(status_code=409, detail="This document is still being processed.")
    return doc


def _friendly_ai_error(exc: Exception) -> str:
    return friendly_ai_error(exc, "The AI couldn't answer just now. Please try again.")


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, user: CurrentUser = Depends(current_user)) -> ChatResponse:
    """Answer a question about one of the user's documents and store the exchange."""
    _require_ready_document(user.token, request.document_id)
    try:
        result = chat_service.answer_question(user.token, request.document_id, request.question)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=_friendly_ai_error(exc))

    storage_service.save_history(
        user.token, user.id, request.document_id, request.question,
        result["answer"], result["sources"],
    )
    return ChatResponse(answer=result["answer"], sources=[Source(**s) for s in result["sources"]])


@router.post("/chat/stream")
def chat_stream(request: ChatRequest, user: CurrentUser = Depends(current_user)) -> StreamingResponse:
    """
    Streaming version of /chat using Server-Sent Events. The browser receives:
      event: sources -> the cited passages (sent before the answer starts)
      event: token   -> each piece of the answer as Gemini writes it
      event: done    -> the answer is complete (and saved to history)
      event: error   -> something failed; `message` explains it
    """
    _require_ready_document(user.token, request.document_id)

    def sse(event: str, data) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    def events():
        sources: list[dict] = []
        parts: list[str] = []
        try:
            for kind, value in chat_service.stream_answer(
                user.token, request.document_id, request.question
            ):
                if kind == "sources":
                    sources = value
                    yield sse("sources", value)
                else:
                    parts.append(value)
                    yield sse("token", value)
        except Exception as exc:  # noqa: BLE001
            yield sse("error", {"message": _friendly_ai_error(exc)})
            return

        answer = "".join(parts).strip()
        try:
            storage_service.save_history(
                user.token, user.id, request.document_id, request.question, answer, sources
            )
        except Exception:  # noqa: BLE001
            pass  # the answer was delivered; a failed history write shouldn't hide it
        yield sse("done", {"answer": answer})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/history", response_model=HistoryResponse)
def get_history(
    document_id: str | None = Query(default=None, description="Filter by document"),
    user: CurrentUser = Depends(current_user),
) -> HistoryResponse:
    if document_id is not None:
        try:
            uuid.UUID(document_id)
        except ValueError:
            return HistoryResponse(items=[])
    history = storage_service.list_history(user.token, document_id=document_id)
    items = [
        HistoryItem(
            id=h["id"],
            document_id=h["document_id"],
            question=h["question"],
            answer=h["answer"],
            sources=[Source(**s) for s in (h.get("sources") or [])],
            created_at=h["created_at"],
        )
        for h in history
    ]
    return HistoryResponse(items=items)
