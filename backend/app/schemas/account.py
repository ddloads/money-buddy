from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.account import AccountType


class AccountBase(BaseModel):
    name: str
    type: AccountType = AccountType.CHECKING
    institution: Optional[str] = None
    starting_balance: Decimal = Decimal("0")
    is_active: bool = True


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    institution: Optional[str] = None
    starting_balance: Optional[Decimal] = None
    is_active: Optional[bool] = None


class AccountRead(AccountBase):
    id: int
    user_id: int
    balance: Decimal
    transaction_count: int
    is_liability: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NetWorthSummary(BaseModel):
    total_assets: Decimal
    total_liabilities: Decimal
    net_worth: Decimal
    account_count: int
