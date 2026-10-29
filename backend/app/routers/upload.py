"""
upload.py (router)
------------------
Endpoints for getting a PDF into the system. All of them require sign-in.

POST   /api/upload                -> upload + process a PDF, returns a document_id
GET    /api/documents             -> list the signed-in user's documents
DELETE /api/documents/{id}        -> delete a document, its passages, chats and file
GET    /api/file/{id}             -> a temporary private link to the original PDF
GET    /api/limits                -> upload limits + this user's storage usage
"""

from __future__ import annotations

import hashlib
import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.core.auth import CurrentUser, current_user
from app.core.config import get_settings
from app.models.schemas import DocumentItem, DocumentsResponse, UploadResponse
from app.services import pdf_service, storage_service
from app.services.supabase_client import SupabaseError

router = APIRouter(prefix="/api", tags=["upload"])
log = logging.getLogger("uvicorn.error")


def _valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...), user: CurrentUser = Depends(current_user)
) -> UploadResponse:
    """
    Receive a single PDF, keep the original in the user's private folder,
    run the RAG ingestion pipeline, and record its metadata.
    """
    # 1. Validation — only accept real PDFs under the size limit.
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a .pdf file.")

    settings = get_settings()
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="This file is empty.")
    if len(contents) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"This file is larger than {settings.max_upload_mb} MB. Try a smaller PDF.",
        )
    if not contents[:1024].lstrip().startswith(b"%PDF"):
        raise HTTPException(
            status_code=400,
            detail="This file isn't a real PDF, even though its name ends in .pdf.",
        )

    token = user.token
    checksum = hashlib.sha256(contents).hexdigest()

    # 2. Same file already in this user's library? Reuse it instead of re-processing.
    existing = await run_in_threadpool(storage_service.find_by_checksum, token, checksum)
    if existing:
        return UploadResponse(
            document_id=existing["document_id"],
            filename=existing["filename"],
            num_pages=existing["num_pages"],
            num_chunks=existing["num_chunks"],
            message="This PDF is already in your library.",
        )

    count = await run_in_threadpool(storage_service.count_documents, token)
    if count >= settings.max_documents_per_user:
        raise HTTPException(
            status_code=409,
            detail=f"Your library is full ({settings.max_documents_per_user} PDFs). Delete one to add another.",
        )

    # 3. Record the document, then keep the original file in private storage.
    document_id = str(uuid.uuid4())
    try:
        await run_in_threadpool(
            storage_service.create_document,
            token, user.id, document_id, file.filename, len(contents), checksum,
        )
        await run_in_threadpool(storage_service.upload_pdf, token, user.id, document_id, contents)
    except SupabaseError as exc:
        log.warning("Saving %s failed: %s", document_id, exc.message[:500])
        await run_in_threadpool(_cleanup, token, document_id)
        raise HTTPException(status_code=500, detail=f"Could not save the file: {exc.message}")

    log.info("Processing %s (%d bytes)", document_id, len(contents))
    # 4. Extract -> chunk -> embed -> store. Slow, blocking work, so it runs
    # in a worker thread instead of blocking the server.
    try:
        result = await run_in_threadpool(
            pdf_service.process_pdf, contents, token, user.id, document_id
        )
    except ValueError as exc:
        await run_in_threadpool(_cleanup, token, document_id)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        log.warning("Processing failed for %s: %s", document_id, str(exc)[:500])
        await run_in_threadpool(_cleanup, token, document_id)
        if "RESOURCE_EXHAUSTED" in str(exc) or "429" in str(exc):
            raise HTTPException(
                status_code=429,
                detail=(
                    "The free Gemini quota is used up for now. Wait a minute and "
                    "try again (if it keeps happening, the daily limit may be reached)."
                ),
            )
        raise HTTPException(status_code=500, detail="Processing failed. Please try again.")

    await run_in_threadpool(
        storage_service.mark_ready, token, document_id, result["num_pages"], result["num_chunks"]
    )

    return UploadResponse(
        document_id=document_id,
        filename=file.filename,
        num_pages=result["num_pages"],
        num_chunks=result["num_chunks"],
        message="PDF processed successfully. You can now ask questions.",
    )


def _cleanup(token: str, document_id: str) -> None:
    try:
        storage_service.delete_document(token, document_id)
    except Exception:  # noqa: BLE001
        pass


@router.get("/documents", response_model=DocumentsResponse)
def list_documents(user: CurrentUser = Depends(current_user)) -> DocumentsResponse:
    docs = storage_service.list_documents(user.token)
    return DocumentsResponse(items=[DocumentItem(**d) for d in docs])


@router.get("/limits")
def get_limits(user: CurrentUser = Depends(current_user)) -> dict:
    """Upload limits and real storage usage, so the frontend never shows made-up numbers."""
    settings = get_settings()
    return {
        "max_upload_mb": settings.max_upload_mb,
        "max_documents": settings.max_documents_per_user,
        "storage_used_bytes": storage_service.storage_used(user.token),
    }


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, user: CurrentUser = Depends(current_user)) -> dict:
    """Delete a document: its file, its passages and its chat history."""
    if not _valid_uuid(document_id) or not storage_service.delete_document(user.token, document_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"deleted": document_id}


@router.get("/file/{document_id}")
def get_file(document_id: str, user: CurrentUser = Depends(current_user)) -> dict:
    """
    A link to the original PDF that works for one hour. The PDF viewer is an
    <iframe>, which can't send the sign-in header, so it gets a signed link.
    """
    doc = storage_service.get_document(user.token, document_id) if _valid_uuid(document_id) else None
    if doc is None:
        raise HTTPException(status_code=404, detail="File not found.")
    try:
        return {"url": storage_service.file_url(user.token, doc), "expires_in": 3600}
    except SupabaseError:
        raise HTTPException(status_code=404, detail="File not found.")
