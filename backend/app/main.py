"""
main.py
-------
The entrypoint that ties everything together and starts the FastAPI app.

Run it (from the backend/ folder) with:
    uvicorn app.main:app --reload --port 8000

Then open http://localhost:8000/docs to see auto-generated, interactive
API documentation where you can test every endpoint by hand.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import upload, chat

settings = get_settings()

app = FastAPI(
    title="InsightPDF AI",
    description="Upload PDFs and ask questions about them using AI (RAG).",
    version="1.0.0",
)

# --- CORS ---
# Browsers block requests from one origin (your frontend, :3000) to another
# (your backend, :8000) unless the backend explicitly allows it. This does that.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register routers ---
app.include_router(upload.router)
app.include_router(chat.router)


@app.get("/")
async def root() -> dict:
    """Simple health check so you can confirm the server is alive."""
    return {"status": "ok", "service": "InsightPDF AI", "docs": "/docs"}
