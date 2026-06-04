from __future__ import annotations

from pydantic import BaseModel, EmailStr

from app.schemas.user import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class TokenData(BaseModel):
    user_id: int
