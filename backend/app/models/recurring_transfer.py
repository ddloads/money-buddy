from __future__ import annotations

from datetime import date as date_, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.bill import RecurrenceInterval


class RecurringTransfer(Base):
    """A scheduled, repeating transfer between two of the user's accounts.

    Due occurrences (``next_run`` on or before today) are materialized into a
    pair of transfer transactions and ``next_run`` is advanced by the interval.
    """

    __tablename__ = "recurring_transfers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    to_account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    frequency: Mapped[RecurrenceInterval] = mapped_column(
        Enum(RecurrenceInterval), nullable=False, default=RecurrenceInterval.MONTHLY
    )
    next_run: Mapped[date_] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    from_account: Mapped["Account"] = relationship("Account", foreign_keys=[from_account_id])  # noqa: F821
    to_account: Mapped["Account"] = relationship("Account", foreign_keys=[to_account_id])  # noqa: F821
