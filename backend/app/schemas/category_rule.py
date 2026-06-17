from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.schemas.category import CategoryRead


class CategoryRuleCreate(BaseModel):
    keyword: str
    category_id: int

    @field_validator("keyword")
    @classmethod
    def keyword_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Keyword cannot be blank")
        return v


class CategoryRuleRead(BaseModel):
    id: int
    user_id: int
    keyword: str
    category_id: int
    created_at: datetime
    category: Optional[CategoryRead] = None

    model_config = {"from_attributes": True}


class ApplyRulesResult(BaseModel):
    updated: int
