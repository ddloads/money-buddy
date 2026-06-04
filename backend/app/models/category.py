from __future__ import annotations

from decimal import Decimal
from typing import List, Optional

from sqlalchemy import BigInteger, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)   # e.g. "#FF5733"
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # e.g. "home", "car"
    monthly_budget: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="categories")  # noqa: F821
    bills: Mapped[List["Bill"]] = relationship("Bill", back_populates="category")  # noqa: F821
