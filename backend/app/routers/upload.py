"""
upload.py (router)
------------------
Endpoints for getting a PDF into the system.

POST /api/upload   -> upload + process a PDF, returns a document_id
GET  /api/documents -> list all processed documents
"""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.models.schemas import (
    UploadResponse,
    DocumentsResponse,
    DocumentItem,
)
from app.services import pdf_service, storage_service

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)) -> UploadResponse:
    """
    Receive a single PDF, save it, run the RAG ingestion pipeline,
    and record its metadata.
    """
    # 1. Basic validation — only accept PDFs.
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a .pdf file.")

    settings = get_settings()
    os.makedirs(settings.upload_dir, exist_ok=True)

    # 2. Give the document a unique ID and save the raw file to disk.
    document_id = str(uuid.uuid4())
    saved_path = os.path.join(settings.upload_dir, f"{document_id}.pdf")

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        with open(saved_path, "wb") as f:
            f.write(contents)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Could not save file: {exc}")

    # 3. Run extract -> chunk -> embed -> store.
    try:
        result = pdf_service.process_pdf(saved_path, document_id)
    except ValueError as exc:
        # Friendly error (e.g. scanned PDF with no text).
        pdf_service.delete_pdf_file(saved_path)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        pdf_service.delete_pdf_file(saved_path)
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")

    # 4. Record metadata so the document shows up in lists.
    storage_service.save_document(
        document_id=document_id,
        filename=file.filename,
        num_pages=result["num_pages"],
        num_chunks=result["num_chunks"],
    )

    return UploadResponse(
        document_id=document_id,
        filename=file.filename,
        num_pages=result["num_pages"],
        num_chunks=result["num_chunks"],
        message="PDF processed successfully. You can now ask questions.",
    )


@router.get("/documents", response_model=DocumentsResponse)
async def list_documents() -> DocumentsResponse:
    docs = storage_service.list_documents()
    items = [DocumentItem(**d) for d in docs]
    return DocumentsResponse(items=items)


@router.get("/file/{document_id}")
async def get_file(document_id: str):
    """
    Serve the raw PDF so the frontend's <iframe> viewer can display it.
    We look it up by document_id (the filename we saved it under).
    """
    settings = get_settings()
    path = os.path.join(settings.upload_dir, f"{document_id}.pdf")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(path, media_type="application/pdf")
