from __future__ import annotations

from typing import List
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "Money Buddy"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/money_buddy"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Stored as a comma-separated string so pydantic-settings doesn't try to
    # JSON-decode the env var. Access the parsed list via `cors_origins_list`.
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── File Uploads ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # ── Frontend ──────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Google OAuth ──────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost/api/auth/google/callback"

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Money Buddy"
    SMTP_TLS: bool = True

    # ── Reminder settings ─────────────────────────────────────────────────────
    REMINDER_DAYS_BEFORE: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
