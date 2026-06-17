"""Keyword-based auto-categorization shared by transactions and the rules API."""
from __future__ import annotations

from typing import Iterable, Optional

from app.models.category_rule import CategoryRule


def build_matchers(rules: Iterable[CategoryRule]) -> list[tuple[str, int]]:
    """Return (lowercased keyword, category_id) pairs, longest keyword first.

    Longer keywords are matched first so more specific rules win over generic
    ones (e.g. "whole foods" before "food").
    """
    pairs = [(r.keyword.lower().strip(), r.category_id) for r in rules if r.keyword.strip()]
    pairs.sort(key=lambda p: len(p[0]), reverse=True)
    return pairs


def match_category(matchers: list[tuple[str, int]], description: Optional[str]) -> Optional[int]:
    """Return the category_id of the first matcher whose keyword is in the text."""
    if not description:
        return None
    text = description.lower()
    for keyword, category_id in matchers:
        if keyword in text:
            return category_id
    return None
