"""
config.py
---------
Central place for all settings. We read them from environment variables
(loaded from the .env file) so that no secret keys live inside the code.

pydantic-settings automatically reads each field from the matching
environment variable name (case-insensitive).
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Secrets / external services ---
    google_api_key: str = ""

    # --- Storage locations ---
    upload_dir: str = "uploads"
    chroma_dir: str = "chroma_db"

    # --- RAG tuning knobs ---
    chunk_size: int = 1000
    chunk_overlap: int = 150
    top_k: int = 4

    # --- Model names ---
    gemini_chat_model: str = "gemini-2.5-flash"
    gemini_embed_model: str = "gemini-embedding-001"

    # --- CORS ---
    frontend_origins: str = "http://localhost:3000"

    # Tell pydantic to load from a .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        """Turn the comma-separated string into a clean Python list."""
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """
    Cached so the .env file is only parsed once.
    Use this everywhere instead of creating Settings() directly.
    """
    return Settings()
