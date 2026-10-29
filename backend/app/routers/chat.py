"""
chat.py (router)
----------------
Endpoints for asking questions and reading past Q&A.

POST /api/chat            -> ask a question about a document
GET  /api/history         -> get chat history (optionally per-document)
"""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

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
def chat(request: ChatRequest) -> ChatResponse:
    """
    Answer a question about a previously uploaded document, then store
    the exchange in chat history.

    NOTE: this is a plain `def` (not `async def`) on purpose. The Gemini call
    below is blocking; FastAPI runs plain `def` endpoints in a thread pool,
    so one slow answer no longer freezes the whole server (and its health check).
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


@router.post("/chat/stream")
def chat_stream(request: ChatRequest) -> StreamingResponse:
    """
    Streaming version of /chat using Server-Sent Events. The browser receives:
      event: sources -> the cited passages (sent before the answer starts)
      event: token   -> each piece of the answer as Gemini writes it
      event: done    -> the answer is complete (and saved to history)
      event: error   -> something failed; `message` explains it
    """
    if storage_service.get_document(request.document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    def sse(event: str, data) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    def events():
        sources: list[dict] = []
        parts: list[str] = []
        try:
            for kind, value in chat_service.stream_answer(
                request.document_id, request.question
            ):
                if kind == "sources":
                    sources = value
                    yield sse("sources", value)
                else:
                    parts.append(value)
                    yield sse("token", value)
        except Exception as exc:  # noqa: BLE001
            text = str(exc)
            if "RESOURCE_EXHAUSTED" in text or "429" in text:
                message = "The free AI quota is used up for now. Wait a minute and try again."
            else:
                message = "The AI couldn't answer just now. Please try again."
            yield sse("error", {"message": message})
            return

        answer = "".join(parts).strip()
        storage_service.save_history(
            document_id=request.document_id,
            question=request.question,
            answer=answer,
            sources=sources,
        )
        yield sse("done", {"answer": answer})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/history", response_model=HistoryResponse)
def get_history(
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
