from __future__ import annotations

import calendar
import csv
import io
import logging
import math
import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.appwrite_config import appwrite_settings
from app.core.config import settings
from app.core.database import get_db
from app.models.account import Account
from app.models.bill import Bill, RecurrenceInterval
from app.models.payment import Payment
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.bill import BillCreate, BillListResponse, BillPayRequest, BillRead, BillUpdate
from app.schemas.payment import PaymentRead
from app.services.payoff import amortize

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}
MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Helpers ───────────────────────────────────────────────────────────────────
def _next_due_date(due: datetime, interval: RecurrenceInterval) -> datetime:
    """Advance a due date by one recurrence interval, clamping to end-of-month."""
    if interval == RecurrenceInterval.DAILY:
        return due + timedelta(days=1)
    if interval == RecurrenceInterval.WEEKLY:
        return due + timedelta(weeks=1)
    if interval == RecurrenceInterval.BIWEEKLY:
        return due + timedelta(weeks=2)
    months = {
        RecurrenceInterval.MONTHLY: 1,
        RecurrenceInterval.QUARTERLY: 3,
        RecurrenceInterval.YEARLY: 12,
    }[interval]
    m = due.month - 1 + months
    year = due.year + m // 12
    month = m % 12 + 1
    day = min(due.day, calendar.monthrange(year, month)[1])
    return due.replace(year=year, month=month, day=day)


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
    status: Optional[str] = Query(None),  # paid | unpaid | upcoming | overdue
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
    sort: Optional[str] = Query("due_date_asc"),  # due_date_asc | due_date_desc | amount_asc | amount_desc | name_asc
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillListResponse:
    """List bills for the current user with optional filters, search, sort, and pagination."""
    from datetime import timezone
    now = datetime.now(timezone.utc)
    upcoming_cutoff = now + timedelta(days=7)

    base_query = select(Bill).where(Bill.user_id == current_user.id)

    if status == "paid":
        base_query = base_query.where(Bill.is_paid == True)  # noqa: E712
    elif status == "unpaid":
        base_query = base_query.where(Bill.is_paid == False)  # noqa: E712
    elif status == "upcoming":
        base_query = base_query.where(Bill.is_paid == False, Bill.due_date <= upcoming_cutoff)
    elif status == "overdue":
        base_query = base_query.where(Bill.is_paid == False, Bill.due_date < now)

    if category_id is not None:
        base_query = base_query.where(Bill.category_id == category_id)
    if search:
        term = f"%{search}%"
        base_query = base_query.where(
            or_(Bill.name.ilike(term), Bill.notes.ilike(term))
        )

    sort_map = {
        "due_date_asc": Bill.due_date.asc(),
        "due_date_desc": Bill.due_date.desc(),
        "amount_asc": Bill.amount.asc(),
        "amount_desc": Bill.amount.desc(),
        "name_asc": Bill.name.asc(),
    }
    order_by = sort_map.get(sort, Bill.due_date.asc())

    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        base_query.options(selectinload(Bill.category))
        .order_by(order_by)
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
    await db.refresh(bill)
    await db.refresh(bill, attribute_names=["category"])
    logger.info("Bill created: id=%s user=%s", bill.id, current_user.id)
    return bill


@router.get("/export")
async def export_bills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Export all bills for the current user as a CSV file."""
    result = await db.execute(
        select(Bill)
        .where(Bill.user_id == current_user.id)
        .options(selectinload(Bill.category))
        .order_by(Bill.due_date.asc())
    )
    bills = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Amount", "Due Date", "Status", "Category", "Recurring", "Interval", "Autopay", "Notes", "Paid At"])
    for bill in bills:
        writer.writerow([
            bill.name,
            f"{bill.amount:.2f}",
            bill.due_date.strftime("%Y-%m-%d"),
            "Paid" if bill.is_paid else "Unpaid",
            bill.category.name if bill.category else "",
            "Yes" if bill.is_recurring else "No",
            bill.recurrence_interval.value if bill.recurrence_interval else "",
            "Yes" if bill.autopay_enabled else "No",
            bill.notes or "",
            bill.paid_at.strftime("%Y-%m-%d") if bill.paid_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bills-export.csv"},
    )


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
    await db.refresh(bill)
    await db.refresh(bill, attribute_names=["category"])
    return bill


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_bill(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Permanently delete a bill."""
    bill = await _get_bill_or_404(db, bill_id, current_user.id)
    # Remove receipt file if present (local storage)
    if bill.receipt_path and os.path.exists(bill.receipt_path):
        try:
            os.remove(bill.receipt_path)
        except OSError as exc:
            logger.warning("Could not delete local receipt file %s: %s", bill.receipt_path, exc)
    
    # Also delete Appwrite storage file if present
    if bill.receipt_url:
        try:
            import re
            match = re.search(r'/files/([a-f0-9-]+)', bill.receipt_url)
            if match:
                file_id = match.group(1)
                from app.services.appwrite import AppwriteStorageService
                storage_service = AppwriteStorageService()
                await storage_service.delete_file(file_id)
                logger.info("Deleted Appwrite receipt for bill %s", bill.id)
        except Exception as exc:
            logger.warning("Could not delete Appwrite receipt %s: %s", bill.receipt_url, exc)
    
    # Keep any reconciled transactions (real money records) but unlink them.
    linked = await db.execute(
        select(Transaction).where(
            Transaction.bill_id == bill.id, Transaction.user_id == current_user.id
        )
    )
    for txn in linked.scalars().all():
        txn.bill_id = None

    await db.delete(bill)
    await db.flush()


@router.post("/{bill_id}/pay", response_model=BillRead)
async def mark_bill_paid(
    bill_id: int,
    payload: Optional[BillPayRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Bill:
    """Mark a bill as paid. For recurring bills, auto-creates the next instance.

    When ``account_id`` is supplied, a matching expense transaction is recorded
    against that account and linked to the bill (reversed if it is un-paid).
    """
    from datetime import timezone

    bill = await _get_bill_or_404(db, bill_id, current_user.id)
    if bill.is_paid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Bill is already marked as paid"
        )
    bill.is_paid = True
    bill.paid_at = datetime.now(timezone.utc)
    db.add(Payment(bill_id=bill.id, user_id=bill.user_id, action="paid", amount=bill.amount))

    # Optional reconciliation: record a real expense transaction for this payment.
    if payload and payload.account_id is not None:
        account = await db.execute(
            select(Account).where(
                Account.id == payload.account_id, Account.user_id == current_user.id
            )
        )
        if account.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        db.add(Transaction(
            user_id=current_user.id,
            account_id=payload.account_id,
            amount=-bill.amount,  # money out
            date=bill.paid_at.date(),
            description=bill.name,
            category_id=bill.category_id,
            bill_id=bill.id,
        ))

    # Apply interest and reduce remaining balance for loans/credit cards
    next_balance: Optional[Decimal] = None
    if bill.remaining_balance is not None and bill.remaining_balance > 0:
        monthly_rate = Decimal(str(bill.interest_rate or 0)) / 100 / 12
        interest_charged = bill.remaining_balance * monthly_rate
        new_balance = bill.remaining_balance + interest_charged - bill.amount
        bill.remaining_balance = max(Decimal("0"), new_balance.quantize(Decimal("0.01")))
        next_balance = bill.remaining_balance if bill.remaining_balance > 0 else None

    if bill.is_recurring and bill.recurrence_interval:
        next_due = _next_due_date(bill.due_date, bill.recurrence_interval)
        next_bill = Bill(
            user_id=bill.user_id,
            name=bill.name,
            amount=bill.amount,
            due_date=next_due,
            is_recurring=True,
            recurrence_interval=bill.recurrence_interval,
            category_id=bill.category_id,
            notes=bill.notes,
            autopay_enabled=bill.autopay_enabled,
            interest_rate=bill.interest_rate,
            remaining_balance=next_balance,
        )
        db.add(next_bill)
        logger.info(
            "Created next recurring bill '%s' due %s (from bill %s)",
            next_bill.name, next_due.date(), bill.id,
        )

    await db.flush()
    await db.refresh(bill)
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
    db.add(Payment(bill_id=bill.id, user_id=bill.user_id, action="unpaid", amount=bill.amount))

    # Reverse any reconciled transaction created when the bill was paid.
    linked = await db.execute(
        select(Transaction).where(
            Transaction.bill_id == bill.id, Transaction.user_id == current_user.id
        )
    )
    for txn in linked.scalars().all():
        await db.delete(txn)

    await db.flush()
    await db.refresh(bill)
    await db.refresh(bill, attribute_names=["category"])
    return bill


@router.get("/{bill_id}/payments", response_model=list[PaymentRead])
async def get_payment_history(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Payment]:
    """Return the payment/unpayment history for a bill."""
    await _get_bill_or_404(db, bill_id, current_user.id)
    result = await db.execute(
        select(Payment)
        .where(Payment.bill_id == bill_id, Payment.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{bill_id}/receipt", response_model=BillRead)
async def upload_receipt(
    bill_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Bill:
    """Upload a receipt image or PDF for a bill using Appwrite storage."""
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
    
    # Generate unique filename with user_id and bill_id for organization
    unique_filename = f"receipt_{bill.user_id}_{bill.id}_{uuid.uuid4().hex}{ext}"

    # Check if Appwrite is configured
    appwrite_enabled = (
        appwrite_settings.APPWRITE_PROJECT_ID and 
        appwrite_settings.APPWRITE_API_KEY and
        appwrite_settings.APPWRITE_ENDPOINT
    )

    receipt_url = None
    
    if appwrite_enabled:
        # Use Appwrite storage service
        try:
            from app.services.appwrite import AppwriteStorageService
            
            storage_service = AppwriteStorageService()
            
            # Upload to Appwrite with file contents directly
            success, result = await storage_service.upload_file(
                user_id=str(bill.user_id),
                bill_id=str(bill.id),
                file_path=None,  # Not using local file path
                filename=unique_filename,
                contents=contents  # Pass the file contents directly
            )
            
            if success:
                receipt_url = result
                logger.info("Receipt uploaded to Appwrite for bill %s", bill.id)
            else:
                logger.error("Appwrite upload failed: %s", result)
                # Fall back to local storage if Appwrite fails
                appwrite_enabled = False
                
        except Exception as e:
            error_msg = str(e)
            if isinstance(e, dict):
                error_msg = str(e.get('message', str(e)))
            logger.error("Appwrite upload exception: %s", error_msg)
            # Fall back to local storage if Appwrite fails
            appwrite_enabled = False
    else:
        logger.info("Appwrite not configured, using local file storage")
        
        # FALLBACK: Use local file storage (original behavior)
        save_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Remove old receipt if present (both local and cloud)
        if bill.receipt_path and os.path.exists(bill.receipt_path):
            try:
                os.remove(bill.receipt_path)
            except OSError as exc:
                logger.warning("Could not remove old local receipt %s: %s", bill.receipt_path, exc)
        
        # Also delete old Appwrite file if exists
        if bill.receipt_url:
            try:
                import re
                match = re.search(r'/files/([a-f0-9-]+)', bill.receipt_url)
                if match:
                    file_id = match.group(1)
                    from app.services.appwrite import AppwriteStorageService
                    storage_service = AppwriteStorageService()
                    await storage_service.delete_file(file_id)
            except Exception as exc:
                logger.warning("Could not delete old Appwrite receipt %s: %s", bill.receipt_url, exc)
        
        with open(save_path, "wb") as fh:
            fh.write(contents)
        
        bill.receipt_path = save_path
        bill.receipt_url = None  # Clear cloud URL since we're using local storage
        await db.flush()
        await db.refresh(bill)
        await db.refresh(bill, attribute_names=["category"])
        logger.info("Receipt saved locally for bill %s → %s", bill.id, save_path)
        
    # SUCCESS: Appwrite upload worked - store the URL in receipt_url
    if appwrite_enabled and receipt_url:
        bill.receipt_url = receipt_url
        bill.receipt_path = None  # Clear local path since we're using cloud storage
        await db.flush()
        await db.refresh(bill)
        await db.refresh(bill, attribute_names=["category"])
        logger.info("Receipt uploaded to Appwrite for bill %s → URL: %s", bill.id, receipt_url[:100] + "...")

    return bill


@router.get("/{bill_id}/payoff", response_model=dict[str, Any])
async def get_payoff_estimate(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return an amortization schedule and estimated payoff date for a bill with a remaining balance."""
    bill = await _get_bill_or_404(db, bill_id, current_user.id)

    if not bill.remaining_balance or bill.remaining_balance <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This bill has no remaining balance set.",
        )

    balance = float(bill.remaining_balance)
    payment = float(bill.amount)
    annual_rate = float(bill.interest_rate or 0)

    result = amortize(balance, payment, annual_rate)

    # Guard: payment must exceed monthly interest to ever pay off
    if not result["payable"]:
        monthly_interest = balance * (annual_rate / 100 / 12)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Monthly payment ({payment:.2f}) does not exceed monthly interest "
                f"({monthly_interest:.2f}). The balance will never be paid off at "
                f"this payment amount."
            ),
        )

    # Drop the internal flag for backward-compatible response shape.
    result.pop("payable", None)
    return result
