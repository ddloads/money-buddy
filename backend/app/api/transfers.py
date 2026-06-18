from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transfer import TransferCreate, TransferRead
from app.services.transfers import make_transfer, materialize_due

logger = logging.getLogger(__name__)
router = APIRouter()


async def _account_or_404(db: AsyncSession, account_id: int, user_id: int) -> Account:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    acc = result.scalar_one_or_none()
    if acc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return acc


@router.get("", response_model=list[TransferRead])
async def list_transfers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TransferRead]:
    """List transfers (paired legs), running any due recurring transfers first."""
    await materialize_due(db, current_user.id)

    accts = await db.execute(select(Account).where(Account.user_id == current_user.id))
    names = {a.id: a.name for a in accts.scalars().all()}

    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id, Transaction.is_transfer == True)  # noqa: E712
        .order_by(Transaction.date.desc(), Transaction.transfer_group)
    )
    legs = result.scalars().all()

    grouped: dict[str, dict] = {}
    for leg in legs:
        g = grouped.setdefault(leg.transfer_group, {})
        if leg.amount < 0:
            g["from_account_id"] = leg.account_id
            g["date"] = leg.date
            g["description"] = leg.notes
        else:
            g["to_account_id"] = leg.account_id
            g["amount"] = leg.amount
            g.setdefault("date", leg.date)
            g.setdefault("description", leg.notes)

    out = []
    for group, g in grouped.items():
        out.append(TransferRead(
            transfer_group=group,
            date=g.get("date"),
            amount=g.get("amount", 0),
            from_account_id=g.get("from_account_id"),
            to_account_id=g.get("to_account_id"),
            from_account_name=names.get(g.get("from_account_id")),
            to_account_name=names.get(g.get("to_account_id")),
            description=g.get("description"),
        ))
    out.sort(key=lambda t: t.date, reverse=True)
    return out


@router.post("", response_model=TransferRead, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    payload: TransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransferRead:
    """Move money from one account to another (creates both linked legs)."""
    from_acc = await _account_or_404(db, payload.from_account_id, current_user.id)
    to_acc = await _account_or_404(db, payload.to_account_id, current_user.id)

    group = make_transfer(
        db, current_user.id, from_acc, to_acc, payload.amount, payload.date, payload.description
    )
    await db.flush()
    logger.info("Transfer %s: %s → %s (%s)", group, from_acc.id, to_acc.id, payload.amount)
    return TransferRead(
        transfer_group=group,
        date=payload.date,
        amount=payload.amount,
        from_account_id=from_acc.id,
        to_account_id=to_acc.id,
        from_account_name=from_acc.name,
        to_account_name=to_acc.name,
        description=payload.description,
    )


@router.delete("/{transfer_group}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_transfer(
    transfer_group: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete both legs of a transfer."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.user_id == current_user.id,
            Transaction.transfer_group == transfer_group,
        )
    )
    legs = result.scalars().all()
    if not legs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    for leg in legs:
        await db.delete(leg)
    await db.flush()
