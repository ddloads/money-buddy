from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.bill import Bill
from app.models.user import User
from app.schemas.bill import BillRead

router = APIRouter()


@router.get("", response_model=dict[str, Any])
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Return high-level bill statistics for the current user.

    Response includes:
    - total_bills:          Total number of bills
    - paid_count:           Number of paid bills
    - unpaid_count:         Number of unpaid bills
    - total_amount:         Sum of all bill amounts
    - total_paid_amount:    Sum of paid bill amounts
    - total_unpaid_amount:  Sum of unpaid bill amounts
    - total_due_this_month: Sum of amounts due in the current calendar month
    - upcoming_bills:       Bills with due_date within the next 7 days (unpaid)
    - monthly_breakdown:    Per-month totals (last 12 months)
    """
    user_id = current_user.id
    now = datetime.now(timezone.utc)

    # ── Aggregate counts & sums ────────────────────────────────────────────────
    agg_result = await db.execute(
        select(
            func.count(Bill.id).label("total"),
            func.coalesce(func.sum(Bill.amount), 0).label("total_amount"),
            func.count(Bill.id).filter(Bill.is_paid == True).label("paid_count"),  # noqa: E712
            func.coalesce(func.sum(Bill.amount).filter(Bill.is_paid == True), 0).label("paid_amount"),  # noqa: E712
        ).where(Bill.user_id == user_id)
    )
    agg = agg_result.one()

    # ── Total due this month ───────────────────────────────────────────────────
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        month_end = now.replace(year=now.year + 1, month=1, day=1)
    else:
        month_end = now.replace(month=now.month + 1, day=1)

    month_result = await db.execute(
        select(func.coalesce(func.sum(Bill.amount), 0)).where(
            Bill.user_id == user_id,
            Bill.due_date >= month_start,
            Bill.due_date < month_end,
        )
    )
    total_due_this_month = month_result.scalar_one()

    # ── Upcoming bills (next 7 days, unpaid) ──────────────────────────────────
    in_7_days = now + timedelta(days=7)
    upcoming_result = await db.execute(
        select(Bill)
        .where(
            Bill.user_id == user_id,
            Bill.is_paid == False,  # noqa: E712
            Bill.due_date >= now,
            Bill.due_date <= in_7_days,
        )
        .options(selectinload(Bill.category))
        .order_by(Bill.due_date.asc())
    )
    upcoming_bills = upcoming_result.scalars().all()

    # ── Monthly breakdown (last 12 months) ────────────────────────────────────
    twelve_months_ago = now - timedelta(days=365)
    monthly_result = await db.execute(
        select(
            extract("year", Bill.due_date).label("year"),
            extract("month", Bill.due_date).label("month"),
            func.coalesce(func.sum(Bill.amount), 0).label("total"),
            func.coalesce(func.sum(Bill.amount).filter(Bill.is_paid == True), 0).label("paid"),  # noqa: E712
        )
        .where(Bill.user_id == user_id, Bill.due_date >= twelve_months_ago)
        .group_by("year", "month")
        .order_by("year", "month")
    )
    monthly_breakdown = [
        {
            "year": int(row.year),
            "month": int(row.month),
            "total": float(row.total),
            "paid": float(row.paid),
            "unpaid": float(row.total) - float(row.paid),
        }
        for row in monthly_result.all()
    ]

    total = int(agg.total)
    paid_count = int(agg.paid_count)
    total_amount = float(agg.total_amount)
    paid_amount = float(agg.paid_amount)

    return {
        "total_bills": total,
        "paid_count": paid_count,
        "unpaid_count": total - paid_count,
        "total_amount": total_amount,
        "total_paid_amount": paid_amount,
        "total_unpaid_amount": total_amount - paid_amount,
        "total_due_this_month": float(total_due_this_month),
        "upcoming_bills": [BillRead.model_validate(b) for b in upcoming_bills],
        "monthly_breakdown": monthly_breakdown,
    }
