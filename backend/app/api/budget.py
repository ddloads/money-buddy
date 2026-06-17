from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.bill import Bill
from app.models.category import Category
from app.models.income import Income, IncomeFrequency
from app.models.user import User

router = APIRouter()

# Monthly-equivalent value of each recurring income frequency.
_MONTHLY_EQUIV = {
    IncomeFrequency.WEEKLY: 4.333,
    IncomeFrequency.BIWEEKLY: 2.167,
    IncomeFrequency.MONTHLY: 1.0,
    IncomeFrequency.QUARTERLY: 1 / 3,
    IncomeFrequency.YEARLY: 1 / 12,
    IncomeFrequency.ONE_TIME: 0.0,
}


async def _monthly_income(db: AsyncSession, user_id: int) -> float:
    result = await db.execute(
        select(Income.amount, Income.frequency).where(
            Income.user_id == user_id, Income.is_active == True  # noqa: E712
        )
    )
    return sum(
        float(row.amount) * _MONTHLY_EQUIV.get(row.frequency, 0.0)
        for row in result.all()
    )


@router.get("", response_model=dict[str, Any])
async def get_budget(
    year: int = Query(..., ge=1970, le=3000),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the budget vs. actual spending breakdown for a given month.

    Budgets are the recurring monthly amounts set on each category. "Spent" is
    the total of all bills due within the selected month (paid or not), which
    represents that month's obligations against the budget.
    """
    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    month_end = (
        datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        if month == 12
        else datetime(year, month + 1, 1, tzinfo=timezone.utc)
    )

    # Spending grouped by category (NULL category_id → uncategorized).
    spend_result = await db.execute(
        select(
            Bill.category_id,
            func.coalesce(func.sum(Bill.amount), 0).label("spent"),
            func.count(Bill.id).label("count"),
        )
        .where(
            Bill.user_id == current_user.id,
            Bill.due_date >= month_start,
            Bill.due_date < month_end,
        )
        .group_by(Bill.category_id)
    )
    spend_map: dict[int | None, tuple[float, int]] = {
        row.category_id: (float(row.spent), int(row.count)) for row in spend_result.all()
    }

    cats_result = await db.execute(
        select(Category).where(Category.user_id == current_user.id).order_by(Category.name)
    )
    categories = cats_result.scalars().all()

    rows: list[dict[str, Any]] = []
    total_budgeted = 0.0
    total_spent = 0.0
    over_budget_count = 0

    for cat in categories:
        spent, count = spend_map.get(cat.id, (0.0, 0))
        budget = float(cat.monthly_budget) if cat.monthly_budget is not None else None
        total_spent += spent
        if budget is not None:
            total_budgeted += budget
        over = budget is not None and spent > budget
        if over:
            over_budget_count += 1
        rows.append({
            "category_id": cat.id,
            "name": cat.name,
            "color": cat.color or "#9ca3af",
            "icon": cat.icon or "",
            "monthly_budget": budget,
            "spent": round(spent, 2),
            "remaining": round(budget - spent, 2) if budget is not None else None,
            "pct": round(spent / budget * 100) if budget else None,
            "bill_count": count,
            "over_budget": over,
        })

    # Sort: budgeted categories first (by spend), then unbudgeted (by spend).
    rows.sort(key=lambda r: (r["monthly_budget"] is None, -r["spent"], r["name"].lower()))

    # Uncategorized bills (no category) — shown separately, never budgeted.
    unc_spent, unc_count = spend_map.get(None, (0.0, 0))
    total_spent += unc_spent
    uncategorized = {
        "category_id": None,
        "name": "Uncategorized",
        "color": "#6b7280",
        "icon": "❓",
        "monthly_budget": None,
        "spent": round(unc_spent, 2),
        "remaining": None,
        "pct": None,
        "bill_count": unc_count,
        "over_budget": False,
    }

    monthly_income = await _monthly_income(db, current_user.id)

    return {
        "year": year,
        "month": month,
        "monthly_income": round(monthly_income, 2),
        "total_budgeted": round(total_budgeted, 2),
        "total_spent": round(total_spent, 2),
        "total_remaining": round(total_budgeted - total_spent, 2),
        "unallocated": round(monthly_income - total_budgeted, 2),
        "over_budget_count": over_budget_count,
        "categories": rows,
        "uncategorized": uncategorized,
    }
