"""Shared logic for account-to-account transfers and recurring transfers."""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.recurring_transfer import RecurringTransfer
from app.models.transaction import Transaction
from app.services.recurrence import advance_date

_MAX_CATCHUP = 120  # safety cap when materializing a long-overdue schedule


def make_transfer(
    db: AsyncSession,
    user_id: int,
    from_acc: Account,
    to_acc: Account,
    amount: Decimal,
    on_date: date,
    description: Optional[str] = None,
) -> str:
    """Create the two linked legs of a transfer. Returns the shared group id."""
    group = uuid.uuid4().hex
    db.add(Transaction(
        user_id=user_id,
        account_id=from_acc.id,
        amount=-amount,
        date=on_date,
        description=f"Transfer to {to_acc.name}",
        notes=description,
        is_transfer=True,
        transfer_group=group,
    ))
    db.add(Transaction(
        user_id=user_id,
        account_id=to_acc.id,
        amount=amount,
        date=on_date,
        description=f"Transfer from {from_acc.name}",
        notes=description,
        is_transfer=True,
        transfer_group=group,
    ))
    return group


async def materialize_due(db: AsyncSession, user_id: int) -> int:
    """Execute any recurring transfers whose next_run is on or before today."""
    today = date.today()
    accts_result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = {a.id: a for a in accts_result.scalars().all()}

    rts_result = await db.execute(
        select(RecurringTransfer).where(
            RecurringTransfer.user_id == user_id,
            RecurringTransfer.is_active == True,  # noqa: E712
            RecurringTransfer.next_run <= today,
        )
    )
    created = 0
    for rt in rts_result.scalars().all():
        from_acc = accounts.get(rt.from_account_id)
        to_acc = accounts.get(rt.to_account_id)
        guard = 0
        while rt.next_run <= today and guard < _MAX_CATCHUP:
            if from_acc is not None and to_acc is not None:
                make_transfer(
                    db, user_id, from_acc, to_acc, rt.amount, rt.next_run,
                    rt.description or "Scheduled transfer",
                )
                created += 1
            rt.next_run = advance_date(rt.next_run, rt.frequency)
            guard += 1
    if created:
        await db.flush()
    return created
