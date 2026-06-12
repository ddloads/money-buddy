from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.income import Income
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeRead, IncomeUpdate

router = APIRouter()


@router.get("", response_model=list[IncomeRead])
async def list_incomes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[IncomeRead]:
    result = await db.execute(
        select(Income)
        .where(Income.user_id == current_user.id)
        .order_by(Income.created_at.desc())
    )
    return [IncomeRead.model_validate(i) for i in result.scalars().all()]


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
async def create_income(
    body: IncomeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeRead:
    income = Income(**body.model_dump(), user_id=current_user.id)
    db.add(income)
    await db.commit()
    await db.refresh(income)
    return IncomeRead.model_validate(income)


@router.get("/{income_id}", response_model=IncomeRead)
async def get_income(
    income_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeRead:
    result = await db.execute(
        select(Income).where(Income.id == income_id, Income.user_id == current_user.id)
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    return IncomeRead.model_validate(income)


@router.put("/{income_id}", response_model=IncomeRead)
async def update_income(
    income_id: int,
    body: IncomeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeRead:
    result = await db.execute(
        select(Income).where(Income.id == income_id, Income.user_id == current_user.id)
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(income, field, value)

    await db.commit()
    await db.refresh(income)
    return IncomeRead.model_validate(income)


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_income(
    income_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Income).where(Income.id == income_id, Income.user_id == current_user.id)
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    await db.delete(income)
    await db.commit()
