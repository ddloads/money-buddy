from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.account import Account, LIABILITY_TYPES
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter()

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


def _month_list(now: datetime, months: int) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for i in range(months - 1, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        out.append((y, m))
    return out


@router.get("", response_model=dict[str, Any])
async def get_reports(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Transaction-driven analytics: cash flow, net-worth trend, and spending
    by category over the last N months."""
    now = datetime.now(timezone.utc)
    window = _month_list(now, months)
    first_year, first_month = window[0]
    since = datetime(first_year, first_month, 1, tzinfo=timezone.utc)
    end = (
        datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
        if now.month == 12
        else datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    )

    # ── Cash flow: income vs expenses per month (from transactions) ──
    cf_result = await db.execute(
        select(
            extract("year", Transaction.date).label("year"),
            extract("month", Transaction.date).label("month"),
            func.coalesce(func.sum(Transaction.amount).filter(Transaction.amount > 0), 0).label("income"),
            func.coalesce(func.sum(Transaction.amount).filter(Transaction.amount < 0), 0).label("expenses"),
        )
        .where(Transaction.user_id == current_user.id, Transaction.date >= since.date())
        .group_by("year", "month")
    )
    cf_by_ym = {
        (int(r.year), int(r.month)): (float(r.income), float(r.expenses)) for r in cf_result.all()
    }

    cash_flow = []
    total_income = 0.0
    total_expenses = 0.0
    for (y, m) in window:
        income, expenses_neg = cf_by_ym.get((y, m), (0.0, 0.0))
        expenses = -expenses_neg  # stored negative → positive magnitude
        total_income += income
        total_expenses += expenses
        cash_flow.append({
            "year": y,
            "month": m,
            "month_name": MONTH_NAMES[m - 1],
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "net": round(income - expenses, 2),
        })

    # ── Net worth trend: month-end net worth across all accounts ──
    accounts_result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    accounts = accounts_result.scalars().all()

    # All-time monthly deltas per account (cumulative needs full history).
    deltas_result = await db.execute(
        select(
            Transaction.account_id,
            extract("year", Transaction.date).label("year"),
            extract("month", Transaction.date).label("month"),
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .where(Transaction.user_id == current_user.id)
        .group_by(Transaction.account_id, "year", "month")
    )
    per_account: dict[int, list[tuple[tuple[int, int], float]]] = {}
    for r in deltas_result.all():
        per_account.setdefault(r.account_id, []).append(((int(r.year), int(r.month)), float(r.total)))

    net_worth_trend = []
    for (y, m) in window:
        assets = 0.0
        liabilities = 0.0
        for acc in accounts:
            delta = sum(
                total for (ym, total) in per_account.get(acc.id, []) if ym <= (y, m)
            )
            balance = float(acc.starting_balance) + delta
            if acc.type in LIABILITY_TYPES:
                liabilities += -balance
            else:
                assets += balance
        net_worth_trend.append({
            "year": y,
            "month": m,
            "month_name": MONTH_NAMES[m - 1],
            "assets": round(assets, 2),
            "liabilities": round(liabilities, 2),
            "net_worth": round(assets - liabilities, 2),
        })

    # ── Spending by category over the window ──
    cat_result = await db.execute(
        select(
            Transaction.category_id,
            Category.name,
            Category.color,
            Category.icon,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == current_user.id,
            Transaction.date >= since.date(),
            Transaction.amount < 0,
        )
        .group_by(Transaction.category_id, Category.name, Category.color, Category.icon)
        .order_by(func.sum(Transaction.amount).asc())  # most negative (most spent) first
    )
    category_spending = [
        {
            "category_id": r.category_id,
            "name": r.name or "Uncategorized",
            "color": r.color or "#9ca3af",
            "icon": r.icon or "",
            "total": round(-float(r.total), 2),
            "count": int(r.count),
        }
        for r in cat_result.all()
    ]

    net = total_income - total_expenses
    return {
        "months": months,
        "start": since.date().isoformat(),
        "totals": {
            "income": round(total_income, 2),
            "expenses": round(total_expenses, 2),
            "net": round(net, 2),
            "savings_rate": round(net / total_income * 100) if total_income > 0 else 0,
            "avg_monthly_spend": round(total_expenses / months, 2),
        },
        "cash_flow": cash_flow,
        "net_worth_trend": net_worth_trend,
        "category_spending": category_spending,
    }
