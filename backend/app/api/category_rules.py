from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.category import Category
from app.models.category_rule import CategoryRule
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.category_rule import (
    ApplyRulesResult,
    CategoryRuleCreate,
    CategoryRuleRead,
)
from app.services.categorize import build_matchers, match_category

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[CategoryRuleRead])
async def list_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CategoryRule]:
    """List the user's auto-categorization rules."""
    result = await db.execute(
        select(CategoryRule)
        .where(CategoryRule.user_id == current_user.id)
        .options(selectinload(CategoryRule.category))
        .order_by(CategoryRule.keyword)
    )
    return list(result.scalars().all())


@router.post("", response_model=CategoryRuleRead, status_code=status.HTTP_201_CREATED)
async def create_rule(
    payload: CategoryRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryRule:
    """Create an auto-categorization rule (keyword → category)."""
    # Ensure the category belongs to the user.
    cat = await db.execute(
        select(Category).where(
            Category.id == payload.category_id, Category.user_id == current_user.id
        )
    )
    if cat.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    rule = CategoryRule(
        user_id=current_user.id,
        keyword=payload.keyword,
        category_id=payload.category_id,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    await db.refresh(rule, attribute_names=["category"])
    return rule


@router.post("/apply", response_model=ApplyRulesResult)
async def apply_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplyRulesResult:
    """Apply all rules to the user's existing uncategorized transactions."""
    rules_result = await db.execute(
        select(CategoryRule).where(CategoryRule.user_id == current_user.id)
    )
    matchers = build_matchers(rules_result.scalars().all())
    if not matchers:
        return ApplyRulesResult(updated=0)

    txns_result = await db.execute(
        select(Transaction).where(
            Transaction.user_id == current_user.id,
            Transaction.category_id.is_(None),
        )
    )
    updated = 0
    for txn in txns_result.scalars().all():
        category_id = match_category(matchers, txn.description)
        if category_id is not None:
            txn.category_id = category_id
            updated += 1

    await db.flush()
    logger.info("Applied category rules to %s transactions for user %s", updated, current_user.id)
    return ApplyRulesResult(updated=updated)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an auto-categorization rule."""
    result = await db.execute(
        select(CategoryRule).where(
            CategoryRule.id == rule_id, CategoryRule.user_id == current_user.id
        )
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    await db.delete(rule)
    await db.flush()
