from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

from app.models.bill import RecurrenceInterval


class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal
    date: dt.date
    description: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Transfer amount must be greater than zero")
        return v

    @model_validator(mode="after")
    def accounts_differ(self):
        if self.from_account_id == self.to_account_id:
            raise ValueError("Transfer must be between two different accounts")
        return self


class TransferRead(BaseModel):
    transfer_group: str
    date: dt.date
    amount: Decimal
    from_account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    from_account_name: Optional[str] = None
    to_account_name: Optional[str] = None
    description: Optional[str] = None


class RecurringTransferBase(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal
    frequency: RecurrenceInterval = RecurrenceInterval.MONTHLY
    next_run: dt.date
    description: Optional[str] = None
    is_active: bool = True

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return v

    @model_validator(mode="after")
    def accounts_differ(self):
        if self.from_account_id == self.to_account_id:
            raise ValueError("Transfer must be between two different accounts")
        return self


class RecurringTransferCreate(RecurringTransferBase):
    pass


class RecurringTransferUpdate(BaseModel):
    from_account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    amount: Optional[Decimal] = None
    frequency: Optional[RecurrenceInterval] = None
    next_run: Optional[dt.date] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RecurringTransferRead(BaseModel):
    id: int
    user_id: int
    from_account_id: int
    to_account_id: int
    from_account_name: Optional[str] = None
    to_account_name: Optional[str] = None
    amount: Decimal
    frequency: RecurrenceInterval
    next_run: dt.date
    description: Optional[str] = None
    is_active: bool
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True}
