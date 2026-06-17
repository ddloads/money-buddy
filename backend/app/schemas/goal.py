from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.goal import GoalType


class GoalBase(BaseModel):
    name: str
    type: GoalType = GoalType.SAVINGS
    target_amount: Decimal
    current_amount: Decimal = Decimal("0")
    target_date: Optional[dt.date] = None
    account_id: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("target_amount")
    @classmethod
    def target_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Target amount must be greater than zero")
        return v


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[GoalType] = None
    target_amount: Optional[Decimal] = None
    current_amount: Optional[Decimal] = None
    target_date: Optional[dt.date] = None
    account_id: Optional[int] = None
    notes: Optional[str] = None


class GoalContribute(BaseModel):
    amount: Decimal

    @field_validator("amount")
    @classmethod
    def amount_nonzero(cls, v: Decimal) -> Decimal:
        if v == 0:
            raise ValueError("Amount cannot be zero")
        return v


class GoalRead(BaseModel):
    id: int
    user_id: int
    name: str
    type: GoalType
    target_amount: Decimal
    current_amount: Decimal
    target_date: Optional[dt.date] = None
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    notes: Optional[str] = None
    # Computed progress fields.
    saved: Decimal
    remaining: Decimal
    progress_pct: int
    completed: bool
    linked: bool
    monthly_needed: Optional[Decimal] = None
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True}
