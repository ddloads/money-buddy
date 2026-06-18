from __future__ import annotations

import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.account import Account, LIABILITY_TYPES
from app.models.bill import Bill
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.account import (
    AccountCreate,
    AccountRead,
    AccountUpdate,
    NetWorthSummary,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_account_or_404(db: AsyncSession, account_id: int, user_id: int) -> Account:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


async def _balances(db: AsyncSession, user_id: int) -> dict[int, tuple[Decimal, int]]:
    """Map account_id → (sum of transaction amounts, transaction count)."""
    result = await db.execute(
        select(
            Transaction.account_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(Transaction.user_id == user_id)
        .group_by(Transaction.account_id)
    )
    return {row.account_id: (Decimal(str(row.total)), int(row.count)) for row in result.all()}


async def _coverage(db: AsyncSession, user_id: int) -> dict[int, tuple[int, Decimal]]:
    """Map account_id → (count, total amount) of unpaid bills funded by it."""
    result = await db.execute(
        select(
            Bill.funding_account_id,
            func.count(Bill.id).label("count"),
            func.coalesce(func.sum(Bill.amount), 0).label("total"),
        )
        .where(
            Bill.user_id == user_id,
            Bill.is_paid == False,  # noqa: E712
            Bill.funding_account_id.isnot(None),
        )
        .group_by(Bill.funding_account_id)
    )
    return {row.funding_account_id: (int(row.count), Decimal(str(row.total))) for row in result.all()}


def _to_read(
    account: Account,
    balance_delta: Decimal,
    count: int,
    coverage: tuple[int, Decimal] = (0, Decimal("0")),
) -> AccountRead:
    return AccountRead(
        id=account.id,
        user_id=account.user_id,
        name=account.name,
        type=account.type,
        institution=account.institution,
        starting_balance=account.starting_balance,
        is_active=account.is_active,
        balance=account.starting_balance + balance_delta,
        transaction_count=count,
        is_liability=account.is_liability,
        covered_bills_count=coverage[0],
        covered_bills_due=coverage[1],
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.get("", response_model=list[AccountRead])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AccountRead]:
    """List the current user's accounts with computed current balances."""
    result = await db.execute(
        select(Account).where(Account.user_id == current_user.id).order_by(Account.name)
    )
    accounts = result.scalars().all()
    balances = await _balances(db, current_user.id)
    coverage = await _coverage(db, current_user.id)
    return [
        _to_read(a, *balances.get(a.id, (Decimal("0"), 0)), coverage.get(a.id, (0, Decimal("0"))))
        for a in accounts
    ]


@router.get("/net-worth", response_model=NetWorthSummary)
async def get_net_worth(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NetWorthSummary:
    """Aggregate assets, liabilities, and net worth across all accounts."""
    result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    accounts = result.scalars().all()
    balances = await _balances(db, current_user.id)

    total_assets = Decimal("0")
    total_liabilities = Decimal("0")
    for a in accounts:
        delta, _ = balances.get(a.id, (Decimal("0"), 0))
        balance = a.starting_balance + delta
        if a.type in LIABILITY_TYPES:
            total_liabilities += -balance  # owed amount (balance is typically negative)
        else:
            total_assets += balance

    return NetWorthSummary(
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=total_assets - total_liabilities,
        account_count=len(accounts),
    )


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
async def create_account(
    payload: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountRead:
    """Create a new account."""
    account = Account(**payload.model_dump(), user_id=current_user.id)
    db.add(account)
    await db.flush()
    await db.refresh(account)
    logger.info("Account created: id=%s user=%s", account.id, current_user.id)
    return _to_read(account, Decimal("0"), 0)


@router.get("/{account_id}", response_model=AccountRead)
async def get_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountRead:
    """Retrieve a single account with its current balance."""
    account = await _get_account_or_404(db, account_id, current_user.id)
    balances = await _balances(db, current_user.id)
    return _to_read(account, *balances.get(account.id, (Decimal("0"), 0)))


@router.put("/{account_id}", response_model=AccountRead)
async def update_account(
    account_id: int,
    payload: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountRead:
    """Update an account."""
    account = await _get_account_or_404(db, account_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    await db.flush()
    await db.refresh(account)
    balances = await _balances(db, current_user.id)
    return _to_read(account, *balances.get(account.id, (Decimal("0"), 0)))


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an account and all of its transactions."""
    account = await _get_account_or_404(db, account_id, current_user.id)
    await db.delete(account)
    await db.flush()
