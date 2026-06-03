from __future__ import annotations

import logging
import math
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.bill import Bill
from app.models.user import User
from app.schemas.bill import BillCreate, BillListResponse, BillRead, BillUpdate

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}
MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Helpers ───────────────────────────────────────────────────────────────────
async def _get_bill_or_404(db: AsyncSession, bill_id: int, user_id: int) -> Bill:
    result = await db.execute(
        select(Bill)
        .where(Bill.id == bill_id, Bill.user_id == user_id)
        .options(selectinload(Bill.category))
    )
    bill = result.scalar_one_or_none()
    if bill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    return bill


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("", response_model=BillListResponse)
async def list_bills(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_paid: Optional[bool] = Query(None),
    category_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillListResponse:
    """List bills for the current user with optional filters and pagination."""
    base_query = select(Bill).where(Bill.user_id == current_user.id)

    if is_paid is not None:
        base_query = base_query.where(Bill.is_paid == is_paid)
    if category_id is not None:
        base_query = base_query.where(Bill.category_id == category_id)

    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar_one()

    # Paginate
    offset = (page - 1) * page_size
    result = await db.execute(
        base_query.options(selectinload(Bill.category))
        .order_by(Bill.due_date.asc())
        .offset(offset)
        .limit(page_size)
    )
    bills = result.scalars().all()

    return BillListResponse(
        items=bills,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.post("", response_model=BillRead, status_code=status.HTTP_201_CREATED)
async def create_bill(
    payload: BillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Bill:
    """Create a new bill."""
    bill = Bill(**payload.model_dump(), user_id=current_user.id)
    db.add(bill)
    await db.flush()
    await db.refresh(bill, attribute_names=["category"])
    logger.info("Bill created: id=%s user=%s", bill.id, current_user.id)
    return bill


@router.get("/{bill_id}", response_model=BillRead)
async def get_bill(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Bill:
    """Retrieve a single bill by ID."""
    return await _get_bill_or_404(db, bill_id, current_user.id)


@router.put("/{bill_id}", response_model=BillRead)
async def update_bill(
    bill_id: int,
    payload: BillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Bill:
    """Update a bill. Only provided fields are changed (PATCH semantics via PUT)."""
    bill = await _get_bill_or_404(db, bill_id, current_user.id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bill, field, value)
    await db.flush()
    await db.refresh(bill, attribute_names=["category"])
    return bill


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_bill(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Permanently delete a bill."""
    bill = await _get_bill_or_404(db, bill_id, current_user.id)
    # Remove receipt file if present
    if bill.receipt_path and os.path.exists(bill.receipt_path):
        try:
            os.remove(bill.receipt_path)
        except OSError as exc:
            logger.warning("Could not delete receipt file %s: %s", bill.receipt_path, exc)
    await db.delete(bill)
    await db.flush()


@router.post("/{bill_id}/pay", response_model=BillRead)
async def mark_bill_paid(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Bill:
    """Mark a bill as paid."""
    from datetime import datetime, timezone

    bill = await _get_bill_or_404(db, bill_id, current_user.id)
    if bill.is_paid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Bill is already marked as paid"
        )
    bill.is_paid = True
    bill.paid_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(bill, attribute_names=["category"])
    return bill


@router.post("/{bill_id}/unpay", response_model=BillRead)
async def mark_bill_unpaid(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Bill:
    """Mark a previously paid bill as unpaid."""
    bill = await _get_bill_or_404(db, bill_id, current_user.id)
    if not bill.is_paid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Bill is not marked as paid"
        )
    bill.is_paid = False
    bill.paid_at = None
    await db.flush()
    await db.refresh(bill, attribute_names=["category"])
    return bill


@router.post("/{bill_id}/receipt", response_model=BillRead)
async def upload_receipt(
    bill_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Bill:
    """Upload a receipt image or PDF for a bill."""
    bill = await _get_bill_or_404(db, bill_id, current_user.id)

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{file.content_type}' is not allowed. "
            f"Accepted types: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    # Determine file extension
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "application/pdf": ".pdf",
    }
    ext = ext_map.get(file.content_type, "")
    filename = f"receipt_{bill.user_id}_{bill.id}_{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, filename)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Remove old receipt if present
    if bill.receipt_path and os.path.exists(bill.receipt_path):
        try:
            os.remove(bill.receipt_path)
        except OSError as exc:
            logger.warning("Could not remove old receipt %s: %s", bill.receipt_path, exc)

    with open(save_path, "wb") as fh:
        fh.write(contents)

    bill.receipt_path = save_path
    await db.flush()
    await db.refresh(bill, attribute_names=["category"])
    logger.info("Receipt uploaded for bill %s → %s", bill.id, save_path)
    return bill
