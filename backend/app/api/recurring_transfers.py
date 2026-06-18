from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.account import Account
from app.models.recurring_transfer import RecurringTransfer
from app.models.user import User
from app.schemas.transfer import (
    RecurringTransferCreate,
    RecurringTransferRead,
    RecurringTransferUpdate,
)
from app.services.transfers import materialize_due

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_or_404(db: AsyncSession, rt_id: int, user_id: int) -> RecurringTransfer:
    result = await db.execute(
        select(RecurringTransfer).where(
            RecurringTransfer.id == rt_id, RecurringTransfer.user_id == user_id
        )
    )
    rt = result.scalar_one_or_none()
    if rt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring transfer not found")
    return rt


async def _validate_accounts(db: AsyncSession, from_id: int, to_id: int, user_id: int) -> None:
    result = await db.execute(
        select(Account.id).where(Account.id.in_([from_id, to_id]), Account.user_id == user_id)
    )
    found = {row[0] for row in result.all()}
    if from_id not in found or to_id not in found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")


async def _with_names(db: AsyncSession, user_id: int, rts: list[RecurringTransfer]) -> list[RecurringTransferRead]:
    accts = await db.execute(select(Account).where(Account.user_id == user_id))
    names = {a.id: a.name for a in accts.scalars().all()}
    out = []
    for rt in rts:
        data = RecurringTransferRead.model_validate(rt)
        data.from_account_name = names.get(rt.from_account_id)
        data.to_account_name = names.get(rt.to_account_id)
        out.append(data)
    return out


@router.get("", response_model=list[RecurringTransferRead])
async def list_recurring_transfers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecurringTransferRead]:
    """List recurring transfers, executing any that have come due."""
    await materialize_due(db, current_user.id)
    result = await db.execute(
        select(RecurringTransfer)
        .where(RecurringTransfer.user_id == current_user.id)
        .order_by(RecurringTransfer.next_run)
    )
    return await _with_names(db, current_user.id, list(result.scalars().all()))


@router.post("", response_model=RecurringTransferRead, status_code=status.HTTP_201_CREATED)
async def create_recurring_transfer(
    payload: RecurringTransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecurringTransferRead:
    """Schedule a repeating transfer between two accounts."""
    await _validate_accounts(db, payload.from_account_id, payload.to_account_id, current_user.id)
    rt = RecurringTransfer(**payload.model_dump(), user_id=current_user.id)
    db.add(rt)
    await db.flush()
    # Execute immediately if the first run is already due.
    await materialize_due(db, current_user.id)
    await db.refresh(rt)
    return (await _with_names(db, current_user.id, [rt]))[0]


@router.put("/{rt_id}", response_model=RecurringTransferRead)
async def update_recurring_transfer(
    rt_id: int,
    payload: RecurringTransferUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecurringTransferRead:
    """Update a recurring transfer."""
    rt = await _get_or_404(db, rt_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    from_id = data.get("from_account_id", rt.from_account_id)
    to_id = data.get("to_account_id", rt.to_account_id)
    if "from_account_id" in data or "to_account_id" in data:
        await _validate_accounts(db, from_id, to_id, current_user.id)
    for field, value in data.items():
        setattr(rt, field, value)
    await db.flush()
    await db.refresh(rt)
    return (await _with_names(db, current_user.id, [rt]))[0]


@router.post("/run", response_model=dict[str, int])
async def run_due(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Manually execute all due recurring transfers now."""
    created = await materialize_due(db, current_user.id)
    return {"created": created}


@router.delete("/{rt_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_recurring_transfer(
    rt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a recurring transfer schedule (past transfers are kept)."""
    rt = await _get_or_404(db, rt_id, current_user.id)
    await db.delete(rt)
    await db.flush()
