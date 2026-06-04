from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PaymentRead(BaseModel):
    id: int
    bill_id: int
    action: str
    amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}
