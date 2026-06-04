from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.bill import Bill
from app.models.category import Category
from app.models.user import User
from app.schemas.bill import BillRead

router = APIRouter()


async def _summary_data(db: AsyncSession, user_id: int) -> dict[str, Any]:
    now = datetime.now(timezone.utc)

    agg_result = await db.execute(
        select(
            func.count(Bill.id).label("total"),
            func.coalesce(func.sum(Bill.amount), 0).label("total_amount"),
            func.count(Bill.id).filter(Bill.is_paid == True).label("paid_count"),  # noqa: E712
            func.coalesce(func.sum(Bill.amount).filter(Bill.is_paid == True), 0).label("paid_amount"),  # noqa: E712
        ).where(Bill.user_id == user_id)
    )
    agg = agg_result.one()

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = (
        now.replace(year=now.year + 1, month=1, day=1)
        if now.month == 12
        else now.replace(month=now.month + 1, day=1)
    )

    month_result = await db.execute(
        select(
            func.coalesce(func.sum(Bill.amount), 0).label("due"),
            func.coalesce(func.sum(Bill.amount).filter(Bill.is_paid == True), 0).label("paid"),  # noqa: E712
        ).where(
            Bill.user_id == user_id,
            Bill.due_date >= month_start,
            Bill.due_date < month_end,
        )
    )
    month = month_result.one()

    overdue_result = await db.execute(
        select(func.count(Bill.id)).where(
            Bill.user_id == user_id,
            Bill.is_paid == False,  # noqa: E712
            Bill.due_date < now,
        )
    )

    total = int(agg.total)
    paid_count = int(agg.paid_count)
    unpaid_count = total - paid_count
    total_amount = float(agg.total_amount)
    paid_amount = float(agg.paid_amount)
    amount_due_this_month = float(month.due)
    amount_paid_this_month = float(month.paid)

    return {
        # Current frontend contract
        "total_bills": total,
        "paid_bills": paid_count,
        "unpaid_bills": unpaid_count,
        "paid_percentage": round((paid_count / total) * 100) if total else 0,
        "overdue_bills": int(overdue_result.scalar_one()),
        "amount_due_this_month": amount_due_this_month,
        "amount_paid_this_month": amount_paid_this_month,
        # Backward-compatible names from the original combined endpoint
        "paid_count": paid_count,
        "unpaid_count": unpaid_count,
        "total_amount": total_amount,
        "total_paid_amount": paid_amount,
        "total_unpaid_amount": total_amount - paid_amount,
        "total_due_this_month": amount_due_this_month,
    }


async def _upcoming_bills(db: AsyncSession, user_id: int, days: int = 7) -> list[BillRead]:
    now = datetime.now(timezone.utc)
    until = now + timedelta(days=days)
    result = await db.execute(
        select(Bill)
        .where(
            Bill.user_id == user_id,
            Bill.is_paid == False,  # noqa: E712
            Bill.due_date >= now,
            Bill.due_date <= until,
        )
        .options(selectinload(Bill.category))
        .order_by(Bill.due_date.asc())
    )
    return [BillRead.model_validate(bill) for bill in result.scalars().all()]


async def _monthly_breakdown(db: AsyncSession, user_id: int, months: int = 12) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=months * 31)
    result = await db.execute(
        select(
            extract("year", Bill.due_date).label("year"),
            extract("month", Bill.due_date).label("month"),
            func.coalesce(func.sum(Bill.amount), 0).label("total"),
            func.coalesce(func.sum(Bill.amount).filter(Bill.is_paid == True), 0).label("paid"),  # noqa: E712
        )
        .where(Bill.user_id == user_id, Bill.due_date >= since)
        .group_by("year", "month")
        .order_by("year", "month")
    )
    return [
        {
            "year": int(row.year),
            "month": int(row.month),
            "total": float(row.total),
            "paid": float(row.paid),
            "unpaid": float(row.total) - float(row.paid),
        }
        for row in result.all()
    ]


@router.get("", response_model=dict[str, Any])
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the original combined dashboard payload."""
    return {
        **await _summary_data(db, current_user.id),
        "upcoming_bills": await _upcoming_bills(db, current_user.id, days=7),
        "monthly_breakdown": await _monthly_breakdown(db, current_user.id, months=12),
    }


@router.get("/summary", response_model=dict[str, Any])
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return summary cards data used by the React dashboard."""
    return await _summary_data(db, current_user.id)


@router.get("/upcoming", response_model=list[BillRead])
async def get_dashboard_upcoming(
    days: int = Query(7, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BillRead]:
    """Return unpaid bills due within the requested number of days."""
    return await _upcoming_bills(db, current_user.id, days=days)


@router.get("/monthly", response_model=list[dict[str, Any]])
async def get_dashboard_monthly(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return monthly paid/unpaid totals for the chart."""
    return await _monthly_breakdown(db, current_user.id, months=months)


@router.get("/categories", response_model=list[dict[str, Any]])
async def get_category_breakdown(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return spending breakdown by category for the current month."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = (
        now.replace(year=now.year + 1, month=1, day=1)
        if now.month == 12
        else now.replace(month=now.month + 1, day=1)
    )

    result = await db.execute(
        select(
            Bill.category_id,
            Category.name,
            Category.color,
            Category.icon,
            Category.monthly_budget,
            func.coalesce(func.sum(Bill.amount), 0).label("total"),
            func.count(Bill.id).label("count"),
        )
        .outerjoin(Category, Bill.category_id == Category.id)
        .where(
            Bill.user_id == current_user.id,
            Bill.due_date >= month_start,
            Bill.due_date < month_end,
        )
        .group_by(Bill.category_id, Category.name, Category.color, Category.icon, Category.monthly_budget)
        .order_by(func.sum(Bill.amount).desc())
    )

    rows = result.all()
    return [
        {
            "category_id": row.category_id,
            "name": row.name or "Uncategorized",
            "color": row.color or "#9ca3af",
            "icon": row.icon or "",
            "total": float(row.total),
            "count": int(row.count),
            "monthly_budget": float(row.monthly_budget) if row.monthly_budget else None,
            "budget_pct": round(float(row.total) / float(row.monthly_budget) * 100)
            if row.monthly_budget
            else None,
        }
        for row in rows
    ]


MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


@router.get("/yearly", response_model=list[dict[str, Any]])
async def get_yearly_breakdown(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return a 12-month comparison across the current and previous year."""
    now = datetime.now(timezone.utc)
    two_years_ago = now.replace(year=now.year - 2, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(
            extract("year", Bill.due_date).label("year"),
            extract("month", Bill.due_date).label("month"),
            func.coalesce(func.sum(Bill.amount), 0).label("total"),
        )
        .where(Bill.user_id == current_user.id, Bill.due_date >= two_years_ago)
        .group_by("year", "month")
        .order_by("year", "month")
    )

    rows_by_ym: dict[tuple[int, int], float] = {}
    for row in result.all():
        rows_by_ym[(int(row.year), int(row.month))] = float(row.total)

    year1 = now.year - 1
    year2 = now.year

    return [
        {
            "month": m,
            "month_name": MONTH_NAMES[m - 1],
            str(year1): rows_by_ym.get((year1, m), 0.0),
            str(year2): rows_by_ym.get((year2, m), 0.0),
        }
        for m in range(1, 13)
    ]
