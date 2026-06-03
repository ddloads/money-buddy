from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_category_or_404(db: AsyncSession, category_id: int, user_id: int) -> Category:
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    cat = result.scalar_one_or_none()
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return cat


@router.get("", response_model=list[CategoryRead])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Category]:
    """List all categories for the current user."""
    result = await db.execute(
        select(Category).where(Category.user_id == current_user.id).order_by(Category.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Category:
    """Create a new category."""
    # Prevent duplicate names for the same user
    existing = await db.execute(
        select(Category).where(
            Category.user_id == current_user.id,
            Category.name == payload.name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{payload.name}' already exists",
        )
    cat = Category(**payload.model_dump(), user_id=current_user.id)
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


@router.get("/{category_id}", response_model=CategoryRead)
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Category:
    """Retrieve a single category by ID."""
    return await _get_category_or_404(db, category_id, current_user.id)


@router.put("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Category:
    """Update a category."""
    cat = await _get_category_or_404(db, category_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await db.flush()
    await db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a category. Bills using it will have their category set to NULL."""
    cat = await _get_category_or_404(db, category_id, current_user.id)
    await db.delete(cat)
    await db.flush()
