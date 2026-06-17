from __future__ import annotations

import enum
from datetime import date as date_, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class GoalType(str, enum.Enum):
    SAVINGS = "savings"
    DEBT = "debt"


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[GoalType] = mapped_column(Enum(GoalType), nullable=False, default=GoalType.SAVINGS)
    # For savings: amount to reach. For debt: the starting balance to eliminate.
    target_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    # Manually-tracked progress, used when no account is linked.
    current_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    target_date: Mapped[Optional[date_]] = mapped_column(Date, nullable=True)
    # Optional link to an account so progress is derived from its live balance.
    account_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="goals")  # noqa: F821
    account: Mapped[Optional["Account"]] = relationship("Account")  # noqa: F821
