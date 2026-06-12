from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List

from app.core.database import Base


class RecurrenceInterval(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    autopay_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurrence_interval: Mapped[Optional[RecurrenceInterval]] = mapped_column(
        Enum(RecurrenceInterval), nullable=True
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    interest_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    remaining_balance: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    receipt_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)  # Local file path (deprecated in favor of cloud storage)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)  # Cloud storage URL (Appwrite, etc.)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reminded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="bills")  # noqa: F821
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="bills")  # noqa: F821
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="bill", cascade="all, delete-orphan")  # noqa: F821
