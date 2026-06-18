from __future__ import annotations

import csv
import io
import logging
import math
from datetime import date as date_, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.account import Account
from app.models.category_rule import CategoryRule
from app.models.transaction import Transaction
from app.models.user import User
from app.services.categorize import build_matchers, match_category
from app.schemas.transaction import (
    ImportPreview,
    ImportPreviewRow,
    ImportResult,
    TransactionCreate,
    TransactionListResponse,
    TransactionRead,
    TransactionUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Header keywords used to auto-detect columns in uploaded CSV files.
_DATE_KEYS = ("date", "posted", "posting", "transaction date")
_DESC_KEYS = ("description", "payee", "name", "memo", "merchant", "details")
_AMOUNT_KEYS = ("amount", "value")
_DEBIT_KEYS = ("debit", "withdrawal", "withdrawals", "money out", "paid out")
_CREDIT_KEYS = ("credit", "deposit", "deposits", "money in", "paid in")

_DATE_FORMATS = ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%m-%d-%Y")


async def _load_matchers(db: AsyncSession, user_id: int) -> list[tuple[str, int]]:
    result = await db.execute(
        select(CategoryRule).where(CategoryRule.user_id == user_id)
    )
    return build_matchers(result.scalars().all())


async def _get_account_or_404(db: AsyncSession, account_id: int, user_id: int) -> Account:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


async def _get_transaction_or_404(db: AsyncSession, txn_id: int, user_id: int) -> Transaction:
    result = await db.execute(
        select(Transaction)
        .where(Transaction.id == txn_id, Transaction.user_id == user_id)
        .options(selectinload(Transaction.category))
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return txn


def _parse_amount(raw: str) -> Optional[Decimal]:
    if raw is None:
        return None
    text = raw.strip().replace(",", "").replace("$", "").replace("£", "").replace("€", "")
    if not text:
        return None
    negative = False
    if text.startswith("(") and text.endswith(")"):  # accounting notation
        negative = True
        text = text[1:-1]
    try:
        value = Decimal(text)
    except (InvalidOperation, ValueError):
        return None
    return -value if negative else value


def _parse_date(raw: str) -> Optional[date_]:
    if not raw:
        return None
    text = raw.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _match_column(headers: list[str], keys: tuple[str, ...]) -> Optional[str]:
    lowered = {h: h.lower().strip() for h in headers}
    # Exact-ish match first, then substring.
    for h, low in lowered.items():
        if low in keys:
            return h
    for h, low in lowered.items():
        if any(k in low for k in keys):
            return h
    return None


def _parse_csv(contents: bytes) -> tuple[dict[str, Optional[str]], list[ImportPreviewRow]]:
    text = contents.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []

    date_col = _match_column(headers, _DATE_KEYS)
    desc_col = _match_column(headers, _DESC_KEYS)
    amount_col = _match_column(headers, _AMOUNT_KEYS)
    debit_col = _match_column(headers, _DEBIT_KEYS)
    credit_col = _match_column(headers, _CREDIT_KEYS)

    detected = {
        "date": date_col,
        "description": desc_col,
        "amount": amount_col or (f"{credit_col} - {debit_col}" if (credit_col or debit_col) else None),
    }

    rows: list[ImportPreviewRow] = []
    for raw in reader:
        d = _parse_date(raw.get(date_col, "")) if date_col else None
        desc = (raw.get(desc_col, "") if desc_col else "").strip()

        if amount_col:
            amount = _parse_amount(raw.get(amount_col, ""))
        else:
            credit = _parse_amount(raw.get(credit_col, "")) if credit_col else None
            debit = _parse_amount(raw.get(debit_col, "")) if debit_col else None
            amount = (credit or Decimal("0")) - (abs(debit) if debit is not None else Decimal("0"))
            if credit is None and debit is None:
                amount = None

        error = None
        valid = True
        if d is None:
            valid, error = False, "Could not read date"
        elif amount is None or amount == 0:
            valid, error = False, "Could not read a non-zero amount"
        elif not desc:
            desc = "(no description)"

        rows.append(ImportPreviewRow(
            date=d, description=desc, amount=amount, valid=valid, error=error
        ))

    return detected, rows


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    account_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
    type: Optional[str] = Query(None),  # income | expense
    start_date: Optional[date_] = Query(None),
    end_date: Optional[date_] = Query(None),
    sort: str = Query("date_desc"),  # date_desc | date_asc | amount_desc | amount_asc
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionListResponse:
    """List transactions with optional filters, search, sort, and pagination."""
    query = select(Transaction).where(Transaction.user_id == current_user.id)

    if account_id is not None:
        query = query.where(Transaction.account_id == account_id)
    if category_id is not None:
        query = query.where(Transaction.category_id == category_id)
    if search:
        query = query.where(Transaction.description.ilike(f"%{search}%"))
    if type == "income":
        query = query.where(Transaction.amount > 0, Transaction.is_transfer == False)  # noqa: E712
    elif type == "expense":
        query = query.where(Transaction.amount < 0, Transaction.is_transfer == False)  # noqa: E712
    elif type == "transfer":
        query = query.where(Transaction.is_transfer == True)  # noqa: E712
    if start_date is not None:
        query = query.where(Transaction.date >= start_date)
    if end_date is not None:
        query = query.where(Transaction.date <= end_date)

    sort_map = {
        "date_desc": (Transaction.date.desc(), Transaction.id.desc()),
        "date_asc": (Transaction.date.asc(), Transaction.id.asc()),
        "amount_desc": (Transaction.amount.desc(),),
        "amount_asc": (Transaction.amount.asc(),),
    }
    order_by = sort_map.get(sort, sort_map["date_desc"])

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.options(selectinload(Transaction.category))
        .order_by(*order_by)
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return TransactionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    """Create a transaction. The account's balance updates automatically."""
    await _get_account_or_404(db, payload.account_id, current_user.id)
    data = payload.model_dump()
    # Auto-categorize from rules when no category was chosen.
    if data.get("category_id") is None:
        matchers = await _load_matchers(db, current_user.id)
        data["category_id"] = match_category(matchers, data.get("description"))
    txn = Transaction(**data, user_id=current_user.id)
    db.add(txn)
    await db.flush()
    await db.refresh(txn)
    await db.refresh(txn, attribute_names=["category"])
    return txn


@router.post("/import/preview", response_model=ImportPreview)
async def preview_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> ImportPreview:
    """Parse an uploaded CSV and return a preview without saving anything."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Please upload a .csv file")
    contents = await file.read()
    detected, rows = _parse_csv(contents)
    valid = sum(1 for r in rows if r.valid)
    return ImportPreview(
        rows=rows[:200],
        detected_columns=detected,
        total_rows=len(rows),
        valid_rows=valid,
    )


@router.post("/import", response_model=ImportResult)
async def import_transactions(
    account_id: int = Form(...),
    file: UploadFile = File(...),
    type_overrides: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportResult:
    """Import all valid rows from a CSV into the given account.

    type_overrides: optional JSON string mapping row index (str) to sign (1 = income, -1 = expense).
    """
    import json as _json

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Please upload a .csv file")
    await _get_account_or_404(db, account_id, current_user.id)

    overrides: dict[int, int] = {}
    if type_overrides:
        try:
            raw = _json.loads(type_overrides)
            overrides = {int(k): int(v) for k, v in raw.items()}
        except Exception:
            pass

    contents = await file.read()
    _, rows = _parse_csv(contents)

    matchers = await _load_matchers(db, current_user.id)

    imported = 0
    skipped = 0
    for idx, row in enumerate(rows):
        if not row.valid or row.amount is None or row.date is None:
            skipped += 1
            continue
        amount = row.amount
        if idx in overrides:
            amount = abs(amount) * Decimal(overrides[idx])
        description = row.description or "(imported)"
        db.add(Transaction(
            user_id=current_user.id,
            account_id=account_id,
            amount=amount,
            date=row.date,
            description=description,
            category_id=match_category(matchers, description),
        ))
        imported += 1

    await db.flush()
    logger.info("Imported %s transactions (%s skipped) into account %s", imported, skipped, account_id)
    return ImportResult(imported=imported, skipped=skipped)


@router.get("/{txn_id}", response_model=TransactionRead)
async def get_transaction(
    txn_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    """Retrieve a single transaction."""
    return await _get_transaction_or_404(db, txn_id, current_user.id)


@router.put("/{txn_id}", response_model=TransactionRead)
async def update_transaction(
    txn_id: int,
    payload: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    """Update a transaction."""
    txn = await _get_transaction_or_404(db, txn_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    if "account_id" in data:
        await _get_account_or_404(db, data["account_id"], current_user.id)
    for field, value in data.items():
        setattr(txn, field, value)
    await db.flush()
    await db.refresh(txn)
    await db.refresh(txn, attribute_names=["category"])
    return txn


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_transaction(
    txn_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a transaction."""
    txn = await _get_transaction_or_404(db, txn_id, current_user.id)
    await db.delete(txn)
    await db.flush()
