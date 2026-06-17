from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from app.schemas.category import CategoryRead


class TransactionBase(BaseModel):
    account_id: int
    amount: Decimal  # signed: positive = money in, negative = money out
    date: dt.date
    description: str
    category_id: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_nonzero(cls, v: Decimal) -> Decimal:
        if v == 0:
            raise ValueError("Amount cannot be zero")
        return v


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    amount: Optional[Decimal] = None
    date: Optional[dt.date] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_nonzero(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v == 0:
            raise ValueError("Amount cannot be zero")
        return v


class TransactionRead(BaseModel):
    id: int
    user_id: int
    account_id: int
    amount: Decimal
    date: dt.date
    description: str
    category_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: dt.datetime
    updated_at: dt.datetime
    category: Optional[CategoryRead] = None

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionRead]
    total: int
    page: int
    page_size: int
    pages: int


class ImportPreviewRow(BaseModel):
    date: Optional[dt.date] = None
    description: str = ""
    amount: Optional[Decimal] = None
    valid: bool = True
    error: Optional[str] = None


class ImportPreview(BaseModel):
    rows: list[ImportPreviewRow]
    detected_columns: dict[str, Optional[str]]
    total_rows: int
    valid_rows: int


class ImportResult(BaseModel):
    imported: int
    skipped: int
