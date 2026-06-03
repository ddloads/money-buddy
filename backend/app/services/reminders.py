from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.bill import Bill
from app.models.user import User
from app.services.email import send_reminder_email
from app.core.config import settings

logger = logging.getLogger(__name__)


async def check_and_send_reminders() -> dict[str, int]:
    """
    Find all unpaid bills whose due_date is within REMINDER_DAYS_BEFORE days from now
    and send a reminder email to each bill owner.

    Returns a dict with keys:
        - checked:  Number of bills evaluated
        - sent:     Number of emails successfully sent
        - failed:   Number of emails that failed
        - skipped:  Number of bills skipped (user email missing, etc.)
    """
    now = datetime.now(timezone.utc)
    reminder_window = now + timedelta(days=settings.REMINDER_DAYS_BEFORE)

    stats = {"checked": 0, "sent": 0, "failed": 0, "skipped": 0}

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Bill)
            .join(User, Bill.user_id == User.id)
            .where(
                Bill.is_paid == False,  # noqa: E712
                Bill.due_date >= now,
                Bill.due_date <= reminder_window,
                User.is_active == True,  # noqa: E712
            )
            .options(selectinload(Bill.user))
            .order_by(Bill.due_date.asc())
        )
        bills = result.scalars().all()

        logger.info(
            "Reminder check: found %d bills due within %d day(s)",
            len(bills),
            settings.REMINDER_DAYS_BEFORE,
        )

        for bill in bills:
            stats["checked"] += 1
            user: User = bill.user

            if not user or not user.email:
                logger.warning("Bill %s has no associated user email — skipping", bill.id)
                stats["skipped"] += 1
                continue

            due_str = bill.due_date.strftime("%B %d, %Y")
            display_name = user.username or user.email.split("@")[0]

            success = send_reminder_email(
                recipient_email=user.email,
                recipient_name=display_name,
                bill_name=bill.name,
                amount=float(bill.amount),
                due_date=due_str,
            )
            if success:
                stats["sent"] += 1
            else:
                stats["failed"] += 1

    logger.info("Reminder run complete: %s", stats)
    return stats


async def run_reminders_as_task() -> None:
    """Entry point for use as a background task or cron job."""
    try:
        stats = await check_and_send_reminders()
        logger.info("Reminder task finished: %s", stats)
    except Exception as exc:
        logger.exception("Unhandled error in reminder task: %s", exc)
