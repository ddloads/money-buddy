from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppwriteSettings(BaseSettings):
    """Appwrite configuration settings."""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Appwrite Connection ────────────────────────────────────────────────
    APPWRITE_ENDPOINT: str = "https://cloud.appwrite.io/v1"
    APPWRITE_PROJECT_ID: str = ""
    APPWRITE_API_KEY: str = ""

    @property
    def appwrite_client(self):
        """Lazy-loaded Appwrite client instance."""
        from appwrite.client import Client
        
        client = Client()
        client.set_endpoint(self.APPWRITE_ENDPOINT)
        client.set_project(self.APPWRITE_PROJECT_ID)
        client.set_key(self.APPWRITE_API_KEY)
        return client

    # ── Storage Bucket Settings ────────────────────────────────────────────
    APPWRITE_STORAGE_BUCKET: str = "money-buddy"
    APPWRITE_STORAGE_FILE_COLLECTION: str = "receipts"
    
    @property
    def storage_client(self):
        """Lazy-loaded Appwrite storage client."""
        return self.appwrite_client

    # ── File Upload Settings ───────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "gif", "webp", "pdf"]


@lru_cache
def get_appwrite_settings() -> AppwriteSettings:
    return AppwriteSettings()


appwrite_settings: AppwriteSettings = get_appwrite_settings()
