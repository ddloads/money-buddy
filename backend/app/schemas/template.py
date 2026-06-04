from __future__ import annotations

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.bill import RecurrenceInterval
from app.schemas.category import CategoryRead


class TemplateCreate(BaseModel):
    name: str
    amount: Decimal
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


class TemplateRead(TemplateCreate):
    id: int
    user_id: int
    category: Optional[CategoryRead] = None

    model_config = {"from_attributes": True}
