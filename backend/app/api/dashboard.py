from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.bill import Bill
from app.models.category import Category
from app.models.income import Income, IncomeFrequency
from app.models.user import User
from app.schemas.bill import BillRead
from app.services.payoff import amortize

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

    # Compute monthly income equivalent from active sources
    income_result = await db.execute(
        select(Income.amount, Income.frequency)
        .where(Income.user_id == user_id, Income.is_active == True)  # noqa: E712
    )
    freq_multipliers = {
        IncomeFrequency.WEEKLY: 4.333,
        IncomeFrequency.BIWEEKLY: 2.167,
        IncomeFrequency.MONTHLY: 1.0,
        IncomeFrequency.QUARTERLY: 1 / 3,
        IncomeFrequency.YEARLY: 1 / 12,
        IncomeFrequency.ONE_TIME: 0.0,
    }
    monthly_income = sum(
        float(row.amount) * freq_multipliers.get(row.frequency, 0)
        for row in income_result.all()
    )

    return {
        # Current frontend contract
        "total_bills": total,
        "paid_bills": paid_count,
        "unpaid_bills": unpaid_count,
        "paid_percentage": round((paid_count / total) * 100) if total else 0,
        "overdue_bills": int(overdue_result.scalar_one()),
        "amount_due_this_month": amount_due_this_month,
        "amount_paid_this_month": amount_paid_this_month,
        "monthly_income": round(monthly_income, 2),
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

FREQ_MULTIPLIERS = {
    IncomeFrequency.WEEKLY: 4.333,
    IncomeFrequency.BIWEEKLY: 2.167,
    IncomeFrequency.MONTHLY: 1.0,
    IncomeFrequency.QUARTERLY: 1 / 3,
    IncomeFrequency.YEARLY: 1 / 12,
    IncomeFrequency.ONE_TIME: None,
}


@router.get("/income-vs-expenses", response_model=list[dict[str, Any]])
async def get_income_vs_expenses(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return monthly income vs expenses comparison for the last N months."""
    now = datetime.now(timezone.utc)

    # Build ordered list of (year, month) for the last N months
    month_list = []
    for i in range(months - 1, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        month_list.append((y, m))

    earliest_year, earliest_month = month_list[0]
    since = datetime(earliest_year, earliest_month, 1, tzinfo=timezone.utc)

    # Monthly expenses from bills
    expenses_result = await db.execute(
        select(
            extract("year", Bill.due_date).label("year"),
            extract("month", Bill.due_date).label("month"),
            func.coalesce(func.sum(Bill.amount), 0).label("expenses"),
        )
        .where(Bill.user_id == current_user.id, Bill.due_date >= since)
        .group_by("year", "month")
    )
    expenses_by_ym = {
        (int(r.year), int(r.month)): float(r.expenses) for r in expenses_result.all()
    }

    # Active income sources
    incomes_result = await db.execute(
        select(Income).where(
            Income.user_id == current_user.id, Income.is_active == True  # noqa: E712
        )
    )
    incomes = incomes_result.scalars().all()

    monthly_recurring = sum(
        float(inc.amount) * FREQ_MULTIPLIERS[inc.frequency]
        for inc in incomes
        if FREQ_MULTIPLIERS.get(inc.frequency) is not None
    )

    one_time_by_ym: dict[tuple[int, int], float] = {}
    for inc in incomes:
        if inc.frequency == IncomeFrequency.ONE_TIME and inc.start_date:
            key = (inc.start_date.year, inc.start_date.month)
            one_time_by_ym[key] = one_time_by_ym.get(key, 0) + float(inc.amount)

    return [
        {
            "year": y,
            "month": m,
            "month_name": MONTH_NAMES[m - 1],
            "income": round(monthly_recurring + one_time_by_ym.get((y, m), 0.0), 2),
            "expenses": round(expenses_by_ym.get((y, m), 0.0), 2),
        }
        for y, m in month_list
    ]


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


# ── Paycheck planning ──────────────────────────────────────────────────────────

_MONTHS_PER_STEP = {
    IncomeFrequency.MONTHLY: 1,
    IncomeFrequency.QUARTERLY: 3,
    IncomeFrequency.YEARLY: 12,
}

# Monthly-equivalent value of each recurring frequency, used to pick the
# "primary" paycheck that sets the cadence for the planner.
_MONTHLY_EQUIV = {
    IncomeFrequency.WEEKLY: 4.333,
    IncomeFrequency.BIWEEKLY: 2.167,
    IncomeFrequency.MONTHLY: 1.0,
    IncomeFrequency.QUARTERLY: 1 / 3,
    IncomeFrequency.YEARLY: 1 / 12,
}


def _advance(d: date, freq: IncomeFrequency, n: int = 1) -> date:
    """Move a date forward (or backward, for negative ``n``) by ``n`` pay cycles."""
    if freq == IncomeFrequency.WEEKLY:
        return d + timedelta(weeks=n)
    if freq == IncomeFrequency.BIWEEKLY:
        return d + timedelta(weeks=2 * n)
    months = _MONTHS_PER_STEP[freq] * n
    total = (d.year * 12 + (d.month - 1)) + months
    year, month0 = divmod(total, 12)
    month = month0 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _period_boundaries(anchor: date, freq: IncomeFrequency, today: date, count: int) -> list[date]:
    """Return ``count + 1`` payday boundaries starting from the current pay period.

    boundaries[0] is the payday that opens the current period (latest payday on
    or before today); each subsequent entry is the following payday.
    """
    pay = anchor
    if pay > today:
        while pay > today:
            pay = _advance(pay, freq, -1)
    else:
        while _advance(pay, freq, 1) <= today:
            pay = _advance(pay, freq, 1)
    boundaries = [pay]
    for _ in range(count):
        boundaries.append(_advance(boundaries[-1], freq, 1))
    return boundaries


def _paydays_in_window(anchor: date, freq: IncomeFrequency, win_start: date, win_end: date) -> int:
    """Count paydays falling in [win_start, win_end) that are on or after the anchor."""
    # Walk to the first payday on or after win_start, whether the anchor sits
    # before or after the window.
    pay = anchor
    if pay < win_start:
        while pay < win_start:
            pay = _advance(pay, freq, 1)
    else:
        while pay >= win_start:
            pay = _advance(pay, freq, -1)
        pay = _advance(pay, freq, 1)
    count = 0
    while pay < win_end:
        if pay >= anchor:
            count += 1
        pay = _advance(pay, freq, 1)
    return count


@router.get("/paycheck-plan", response_model=dict[str, Any])
async def get_paycheck_plan(
    periods: int = Query(3, ge=1, le=6),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Bucket unpaid bills into upcoming pay periods so the user can see what
    comes out of this paycheck versus the next one(s)."""
    today = datetime.now(timezone.utc).date()

    incomes_result = await db.execute(
        select(Income).where(
            Income.user_id == current_user.id, Income.is_active == True  # noqa: E712
        )
    )
    incomes = incomes_result.scalars().all()
    recurring = [i for i in incomes if i.frequency != IncomeFrequency.ONE_TIME]

    if not recurring:
        return {
            "has_schedule": False,
            "frequency": None,
            "periods": [],
        }

    # The largest recurring source (by monthly-equivalent value) sets the cadence.
    primary = max(
        recurring,
        key=lambda i: float(i.amount) * _MONTHLY_EQUIV.get(i.frequency, 0),
    )
    primary_anchor = primary.start_date or today
    boundaries = _period_boundaries(primary_anchor, primary.frequency, today, periods)

    bills_result = await db.execute(
        select(Bill)
        .where(Bill.user_id == current_user.id, Bill.is_paid == False)  # noqa: E712
        .options(selectinload(Bill.category))
        .order_by(Bill.due_date.asc())
    )
    bills = bills_result.scalars().all()

    # Pre-compute per-period buckets.
    buckets: list[list[dict[str, Any]]] = [[] for _ in range(periods)]
    last_boundary = boundaries[-1]
    for bill in bills:
        d = bill.due_date.date()
        # Bills due before the current period opened are overdue carry-over →
        # they still have to come out of this paycheck.
        if d < boundaries[0]:
            idx = 0
        elif d >= last_boundary:
            continue  # belongs to a period beyond the requested window
        else:
            idx = next(
                i for i in range(periods) if boundaries[i] <= d < boundaries[i + 1]
            )
        payload = BillRead.model_validate(bill).model_dump()
        payload["overdue"] = d < today
        buckets[idx].append(payload)

    period_list: list[dict[str, Any]] = []
    for i in range(periods):
        win_start, win_end = boundaries[i], boundaries[i + 1]

        income = 0.0
        for inc in recurring:
            anchor = inc.start_date or today
            income += _paydays_in_window(anchor, inc.frequency, win_start, win_end) * float(inc.amount)
        # One-time income landing inside the window.
        for inc in incomes:
            if inc.frequency == IncomeFrequency.ONE_TIME and inc.start_date:
                if win_start <= inc.start_date < win_end:
                    income += float(inc.amount)

        bills_total = sum(float(b["amount"]) for b in buckets[i])
        period_list.append({
            "index": i,
            "payday": win_start.isoformat(),
            "start": win_start.isoformat(),
            "end": win_end.isoformat(),
            "income": round(income, 2),
            "bills_total": round(bills_total, 2),
            "leftover": round(income - bills_total, 2),
            "bill_count": len(buckets[i]),
            "bills": buckets[i],
        })

    return {
        "has_schedule": True,
        "frequency": primary.frequency.value,
        "primary_source": primary.name,
        "periods": period_list,
    }


@router.get("/debt", response_model=dict[str, Any])
async def get_debt_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Summarize outstanding debt (bills with a remaining balance) and project
    how much can be paid off, including total interest and payoff dates."""
    result = await db.execute(
        select(Bill)
        .where(Bill.user_id == current_user.id, Bill.remaining_balance > 0)
        .options(selectinload(Bill.category))
        .order_by(Bill.remaining_balance.desc())
    )
    bills = result.scalars().all()

    items: list[dict[str, Any]] = []
    total_debt = 0.0
    monthly_payment = 0.0
    monthly_interest = 0.0
    projected_interest = 0.0
    payable_count = 0

    for bill in bills:
        balance = float(bill.remaining_balance)
        payment = float(bill.amount)
        rate = float(bill.interest_rate or 0)
        amo = amortize(balance, payment, rate)

        total_debt += balance
        monthly_payment += payment
        monthly_interest += balance * (rate / 100 / 12)
        if amo["payable"]:
            payable_count += 1
            projected_interest += amo["total_interest"] or 0.0

        items.append({
            "id": bill.id,
            "name": bill.name,
            "category": {
                "name": bill.category.name,
                "color": bill.category.color,
                "icon": bill.category.icon,
            } if bill.category else None,
            "remaining_balance": round(balance, 2),
            "monthly_payment": round(payment, 2),
            "interest_rate": rate,
            "payable": amo["payable"],
            "months_remaining": amo["months_remaining"],
            "estimated_payoff_date": amo["estimated_payoff_date"],
            "total_interest": amo["total_interest"],
        })

    return {
        "total_debt": round(total_debt, 2),
        "debt_count": len(items),
        "monthly_payment": round(monthly_payment, 2),
        "monthly_interest": round(monthly_interest, 2),
        "projected_interest": round(projected_interest, 2),
        "all_payable": payable_count == len(items),
        "items": items,
    }
