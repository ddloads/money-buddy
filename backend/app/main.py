from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, bills, categories, dashboard, income, templates

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle events."""
    # Create upload directory if it doesn't exist
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info("Upload directory ensured: %s", settings.UPLOAD_DIR)

    # Create DB tables (dev convenience; use Alembic for production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                "ALTER TABLE bills "
                "ADD COLUMN IF NOT EXISTS autopay_enabled BOOLEAN NOT NULL DEFAULT false"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE bills "
                "ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS notif_email_reminders BOOLEAN NOT NULL DEFAULT true"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS notif_overdue_alerts BOOLEAN NOT NULL DEFAULT true"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS notif_weekly_summary BOOLEAN NOT NULL DEFAULT true"
            )
        )
        # payments and bill_templates tables are handled by create_all via their models
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD'"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE categories "
                "ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12,2)"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE bills "
                "ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5,2)"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE bills "
                "ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(12,2)"
            )
        )
    logger.info("Database tables ready")

    yield

    # Cleanup
    await engine.dispose()
    logger.info("Database connections closed")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Money Buddy",
        description="A bill management API for tracking, paying, and categorising your bills.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── Session (required for Google OAuth state) ─────────────────────────────
    app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Static uploads ────────────────────────────────────────────────────────
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
    app.include_router(bills.router, prefix="/bills", tags=["Bills"])
    app.include_router(categories.router, prefix="/categories", tags=["Categories"])
    app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
    app.include_router(income.router, prefix="/income", tags=["Income"])
    app.include_router(templates.router, prefix="/templates", tags=["Templates"])

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "ok", "app": "Money Buddy"}

    return app


app = create_app()
