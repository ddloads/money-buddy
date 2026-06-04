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
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    google_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    model_config = {"from_attributes": True}
