"""Shared loan/credit-card amortization helpers.

Used by both the per-bill payoff endpoint (`/bills/{id}/payoff`) and the
dashboard debt overview (`/dashboard/debt`) so the math lives in one place.
"""
from __future__ import annotations

from datetime import date
from typing import Any

_MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

MAX_MONTHS = 360  # 30-year cap


def amortize(
    balance: float,
    payment: float,
    annual_rate: float,
    start: date | None = None,
) -> dict[str, Any]:
    """Project paying down ``balance`` with a fixed ``payment`` each month.

    Returns a dict describing the schedule. ``payable`` is ``False`` when the
    payment never exceeds the accruing interest (the balance would grow
    forever), in which case the schedule is empty.
    """
    start = start or date.today()
    monthly_rate = annual_rate / 100 / 12

    if payment <= 0:
        return _unpayable(balance, payment, annual_rate)

    # If interest outpaces the payment the balance never reaches zero.
    if monthly_rate > 0 and payment <= balance * monthly_rate:
        return _unpayable(balance, payment, annual_rate)

    schedule: list[dict[str, Any]] = []
    total_interest = 0.0
    total_paid = 0.0
    remaining = balance

    for offset in range(1, MAX_MONTHS + 1):
        interest = remaining * monthly_rate
        actual_payment = min(payment, remaining + interest)
        principal = actual_payment - interest
        remaining -= principal
        if remaining < 0.005:
            remaining = 0.0

        total_interest += interest
        total_paid += actual_payment

        m_idx = (start.month - 1 + offset) % 12
        y = start.year + (start.month - 1 + offset) // 12

        schedule.append({
            "month": offset,
            "year": y,
            "month_name": _MONTH_NAMES[m_idx],
            "payment": round(actual_payment, 2),
            "principal": round(principal, 2),
            "interest": round(interest, 2),
            "balance": round(remaining, 2),
        })

        if remaining == 0.0:
            break

    last = schedule[-1]
    return {
        "payable": True,
        "remaining_balance": round(balance, 2),
        "monthly_payment": round(payment, 2),
        "interest_rate": annual_rate,
        "months_remaining": len(schedule),
        "estimated_payoff_date": f"{last['year']}-{last['month_name']}",
        "total_interest": round(total_interest, 2),
        "total_paid": round(total_paid, 2),
        "schedule": schedule,
    }


def _unpayable(balance: float, payment: float, annual_rate: float) -> dict[str, Any]:
    return {
        "payable": False,
        "remaining_balance": round(balance, 2),
        "monthly_payment": round(payment, 2),
        "interest_rate": annual_rate,
        "months_remaining": None,
        "estimated_payoff_date": None,
        "total_interest": None,
        "total_paid": None,
        "schedule": [],
    }
