from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM configuration
    llm_provider: str = "openrouter"  # "openrouter", "openai", or "anthropic"
    openrouter_api_key: Optional[str] = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    llm_model: str = "openai/gpt-4o-mini"
    max_tokens: int = 1000
    temperature: float = 0.2
    llm_timeout_seconds: int = 45

    # Backend
    host: str = "0.0.0.0"
    port: int = int(os.environ.get("PORT", "8000"))

    # CORS
    allowed_origin: str = "http://localhost:3000"

    # File upload limits
    max_file_size_mb: int = 10
    allowed_extensions: tuple = (".pdf", ".docx")
    max_storage_mb: int = 500

    # ChromaDB
    chroma_persist_dir: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")
    database_path: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "sourceai.db")

    # Rate limiting (requests per minute)
    rate_limit_requests: int = 20
    rate_limit_window_seconds: int = 60

    # JWT Authentication
    jwt_secret: str = os.environ.get("JWT_SECRET", "change-this-to-a-random-secret-key-in-production")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
