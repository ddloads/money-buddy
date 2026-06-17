from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.accounts import _balances
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.account import Account
from app.models.goal import Goal, GoalType
from app.models.user import User
from app.schemas.goal import GoalContribute, GoalCreate, GoalRead, GoalUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_goal_or_404(db: AsyncSession, goal_id: int, user_id: int) -> Goal:
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return goal


def _months_until(target: date) -> int:
    today = date.today()
    return max(1, (target.year - today.year) * 12 + (target.month - today.month))


def _to_read(goal: Goal, account: Account | None, account_balance: Decimal | None) -> GoalRead:
    target = float(goal.target_amount)
    linked = goal.account_id is not None and account is not None

    if linked:
        bal = float(account_balance or 0)
        if goal.type == GoalType.DEBT:
            owed = max(0.0, -bal)
            saved = max(0.0, target - owed)  # amount paid down from the original balance
        else:
            saved = max(0.0, bal)
    else:
        saved = float(goal.current_amount)

    remaining = max(0.0, target - saved)
    pct = round(min(100.0, saved / target * 100)) if target > 0 else 0
    completed = target > 0 and saved >= target

    monthly_needed = None
    if goal.target_date and remaining > 0:
        monthly_needed = round(remaining / _months_until(goal.target_date), 2)

    return GoalRead(
        id=goal.id,
        user_id=goal.user_id,
        name=goal.name,
        type=goal.type,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        target_date=goal.target_date,
        account_id=goal.account_id,
        account_name=account.name if account else None,
        notes=goal.notes,
        saved=round(saved, 2),
        remaining=round(remaining, 2),
        progress_pct=pct,
        completed=completed,
        linked=linked,
        monthly_needed=monthly_needed,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


async def _context(db: AsyncSession, user_id: int):
    """Load accounts + balances once for computing linked-goal progress."""
    accts_result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = {a.id: a for a in accts_result.scalars().all()}
    balances = await _balances(db, user_id)

    def balance_of(account_id: int | None) -> Decimal | None:
        if account_id is None or account_id not in accounts:
            return None
        delta, _ = balances.get(account_id, (Decimal("0"), 0))
        return accounts[account_id].starting_balance + delta

    return accounts, balance_of


async def _validate_account(db: AsyncSession, account_id: int | None, user_id: int) -> None:
    if account_id is None:
        return
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")


@router.get("", response_model=list[GoalRead])
async def list_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GoalRead]:
    """List the user's goals with computed progress."""
    result = await db.execute(
        select(Goal).where(Goal.user_id == current_user.id).order_by(Goal.created_at.desc())
    )
    goals = result.scalars().all()
    accounts, balance_of = await _context(db, current_user.id)
    return [_to_read(g, accounts.get(g.account_id), balance_of(g.account_id)) for g in goals]


@router.post("", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalRead:
    """Create a savings or debt-payoff goal."""
    await _validate_account(db, payload.account_id, current_user.id)
    goal = Goal(**payload.model_dump(), user_id=current_user.id)
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    accounts, balance_of = await _context(db, current_user.id)
    return _to_read(goal, accounts.get(goal.account_id), balance_of(goal.account_id))


@router.put("/{goal_id}", response_model=GoalRead)
async def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalRead:
    """Update a goal."""
    goal = await _get_goal_or_404(db, goal_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    if "account_id" in data:
        await _validate_account(db, data["account_id"], current_user.id)
    for field, value in data.items():
        setattr(goal, field, value)
    await db.flush()
    await db.refresh(goal)
    accounts, balance_of = await _context(db, current_user.id)
    return _to_read(goal, accounts.get(goal.account_id), balance_of(goal.account_id))


@router.post("/{goal_id}/contribute", response_model=GoalRead)
async def contribute_to_goal(
    goal_id: int,
    payload: GoalContribute,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalRead:
    """Add (or subtract) an amount from a manually-tracked goal's progress."""
    goal = await _get_goal_or_404(db, goal_id, current_user.id)
    goal.current_amount = max(Decimal("0"), goal.current_amount + payload.amount)
    await db.flush()
    await db.refresh(goal)
    accounts, balance_of = await _context(db, current_user.id)
    return _to_read(goal, accounts.get(goal.account_id), balance_of(goal.account_id))


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a goal."""
    goal = await _get_goal_or_404(db, goal_id, current_user.id)
    await db.delete(goal)
    await db.flush()
