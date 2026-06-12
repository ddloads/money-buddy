from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter()

_MIGRATIONS = [
    # bills columns
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS autopay_enabled BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5,2)",
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(12,2)",
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(512)",
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ",
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    # users columns
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_email_reminders BOOLEAN NOT NULL DEFAULT true",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_overdue_alerts BOOLEAN NOT NULL DEFAULT true",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_weekly_summary BOOLEAN NOT NULL DEFAULT true",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS default_categories_seeded_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    # categories columns
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12,2)",
]


@router.post("/migrate", summary="Run pending schema migrations")
async def run_migrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applied = []
    errors = []
    for stmt in _MIGRATIONS:
        try:
            await db.execute(text(stmt))
            applied.append(stmt)
        except Exception as exc:
            errors.append({"stmt": stmt, "error": str(exc)})
    await db.commit()
    return {"applied": len(applied), "errors": errors}