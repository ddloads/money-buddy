from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None


class UserCreate(UserBase):
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    notif_email_reminders: Optional[bool] = None
    notif_overdue_alerts: Optional[bool] = None
    notif_weekly_summary: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    google_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    notif_email_reminders: bool = True
    notif_overdue_alerts: bool = True
    notif_weekly_summary: bool = True

    model_config = {"from_attributes": True}
