from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.template import BillTemplate
from app.models.user import User
from app.schemas.template import TemplateCreate, TemplateRead

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[TemplateRead])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BillTemplate]:
    result = await db.execute(
        select(BillTemplate)
        .where(BillTemplate.user_id == current_user.id)
        .options(selectinload(BillTemplate.category))
        .order_by(BillTemplate.name.asc())
    )
    return result.scalars().all()


@router.post("", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillTemplate:
    template = BillTemplate(**payload.model_dump(), user_id=current_user.id)
    db.add(template)
    await db.flush()
    await db.refresh(template)
    await db.refresh(template, attribute_names=["category"])
    logger.info("Template created: '%s' user=%s", template.name, current_user.id)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(BillTemplate).where(
            BillTemplate.id == template_id, BillTemplate.user_id == current_user.id
        )
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    await db.delete(template)
    await db.flush()
