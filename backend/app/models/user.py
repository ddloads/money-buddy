from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import BigInteger, Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_email_reminders: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_overdue_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_weekly_summary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default='USD', nullable=False)
    default_categories_seeded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    bills: Mapped[List["Bill"]] = relationship(  # noqa: F821
        "Bill", back_populates="user", cascade="all, delete-orphan"
    )
    categories: Mapped[List["Category"]] = relationship(  # noqa: F821
        "Category", back_populates="user", cascade="all, delete-orphan"
    )
    incomes: Mapped[List["Income"]] = relationship(  # noqa: F821
        "Income", back_populates="user", cascade="all, delete-orphan"
    )
    accounts: Mapped[List["Account"]] = relationship(  # noqa: F821
        "Account", back_populates="user", cascade="all, delete-orphan"
    )
    transactions: Mapped[List["Transaction"]] = relationship(  # noqa: F821
        "Transaction", back_populates="user", cascade="all, delete-orphan"
    )
    goals: Mapped[List["Goal"]] = relationship(  # noqa: F821
        "Goal", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def first_name(self) -> Optional[str]:
        """Best-effort first name derived from the stored display name."""
        if not self.username:
            return None
        return self.username.split(" ", 1)[0]

    @property
    def last_name(self) -> Optional[str]:
        """Best-effort last name derived from the stored display name."""
        if not self.username or " " not in self.username:
            return None
        return self.username.split(" ", 1)[1]
