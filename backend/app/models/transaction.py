from __future__ import annotations

from datetime import date as date_, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Signed: positive = money in (deposit/income), negative = money out (expense).
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    date: Mapped[date_] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    account: Mapped["Account"] = relationship("Account", back_populates="transactions")  # noqa: F821
    category: Mapped[Optional["Category"]] = relationship("Category")  # noqa: F821
    user: Mapped["User"] = relationship("User", back_populates="transactions")  # noqa: F821
