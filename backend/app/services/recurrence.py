"""Date math for recurrence intervals, shared by recurring transfers."""
from __future__ import annotations

import calendar
from datetime import date, timedelta

from app.models.bill import RecurrenceInterval

_MONTHS = {
    RecurrenceInterval.MONTHLY: 1,
    RecurrenceInterval.QUARTERLY: 3,
    RecurrenceInterval.YEARLY: 12,
}


def advance_date(d: date, interval: RecurrenceInterval) -> date:
    """Advance a date by one recurrence interval, clamping to month length."""
    if interval == RecurrenceInterval.DAILY:
        return d + timedelta(days=1)
    if interval == RecurrenceInterval.WEEKLY:
        return d + timedelta(weeks=1)
    if interval == RecurrenceInterval.BIWEEKLY:
        return d + timedelta(weeks=2)
    months = _MONTHS[interval]
    total = (d.year * 12 + (d.month - 1)) + months
    year, month0 = divmod(total, 12)
    month = month0 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)
