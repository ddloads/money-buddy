from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, field_validator


class CategoryBase(BaseModel):
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    monthly_budget: Optional[float] = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.startswith("#"):
            raise ValueError("Color must be a hex string starting with '#'")
        return v


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    monthly_budget: Optional[float] = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.startswith("#"):
            raise ValueError("Color must be a hex string starting with '#'")
        return v


class CategoryRead(CategoryBase):
    id: int
    user_id: int

    model_config = {"from_attributes": True}
