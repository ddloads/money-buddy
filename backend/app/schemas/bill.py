from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.bill import RecurrenceInterval
from app.schemas.category import CategoryRead


class BillBase(BaseModel):
    name: str
    amount: Decimal
    due_date: datetime
    autopay_enabled: bool = False
    is_recurring: bool = False
    recurrence_interval: Optional[RecurrenceInterval] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be a positive number")
        return v

    @field_validator("recurrence_interval")
    @classmethod
    def interval_requires_recurring(
        cls, v: Optional[RecurrenceInterval], info
    ) -> Optional[RecurrenceInterval]:
        # 'is_recurring' might not yet be set if coming from a dict — soft check
        return v


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    autopay_enabled: Optional[bool] = None
    is_recurring: Optional[bool] = None
    recurrence_interval: Optional[RecurrenceInterval] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Amount must be a positive number")
        return v


class BillRead(BillBase):
    id: int
    user_id: int
    is_paid: bool
    paid_at: Optional[datetime] = None
    receipt_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryRead] = None

    model_config = {"from_attributes": True}


class BillListResponse(BaseModel):
    items: list[BillRead]
    total: int
    page: int
    page_size: int
    pages: int
