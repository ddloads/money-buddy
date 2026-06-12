from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.user import User


DEFAULT_CATEGORIES = [
    {"name": "Housing", "icon": "🏠", "color": "#4f46e5"},
    {"name": "Utilities", "icon": "💡", "color": "#0ea5e9"},
    {"name": "Transport", "icon": "🚗", "color": "#f59e0b"},
    {"name": "Groceries", "icon": "🛒", "color": "#10b981"},
    {"name": "Health", "icon": "💊", "color": "#ef4444"},
    {"name": "Entertainment", "icon": "🎬", "color": "#8b5cf6"},
    {"name": "Subscriptions", "icon": "📱", "color": "#06b6d4"},
    {"name": "Insurance", "icon": "🛡️", "color": "#64748b"},
    {"name": "Personal Care", "icon": "🧴", "color": "#ec4899"},
    {"name": "Savings", "icon": "💰", "color": "#84cc16"},
]


async def ensure_default_categories(db: AsyncSession, user_id: int) -> int:
    """Seed defaults once per user, then never recreate them after user edits/deletes."""
    user = await db.get(User, user_id)
    if user is None:
        return 0
    if user.default_categories_seeded_at is not None:
        return 0

    result = await db.execute(select(Category.name).where(Category.user_id == user_id))
    existing_names = set(result.scalars().all())

    missing = [
        Category(user_id=user_id, name=cat["name"], icon=cat["icon"], color=cat["color"])
        for cat in DEFAULT_CATEGORIES
        if cat["name"] not in existing_names
    ]
    if missing:
        db.add_all(missing)

    user.default_categories_seeded_at = datetime.now(timezone.utc)
    await db.flush()
    return len(missing)
