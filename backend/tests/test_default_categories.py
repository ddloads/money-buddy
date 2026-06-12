from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from app.services.default_categories import DEFAULT_CATEGORIES, ensure_default_categories


class FakeResult:
    def __init__(self, values):
        self._values = values

    def scalars(self):
        return self

    def all(self):
        return list(self._values)


class FakeUser:
    def __init__(self, seeded_at=None):
        self.default_categories_seeded_at = seeded_at


class FakeSession:
    def __init__(self, user, existing_names):
        self.user = user
        self.existing_names = existing_names
        self.added = []
        self.flush_calls = 0
        self.execute_calls = 0
        self.get_calls = []

    async def get(self, model, user_id):
        self.get_calls.append((model.__name__, user_id))
        return self.user

    async def execute(self, _statement):
        self.execute_calls += 1
        return FakeResult(self.existing_names)

    def add_all(self, rows):
        self.added.extend(rows)

    async def flush(self):
        self.flush_calls += 1


def test_seeded_user_is_not_reseeded_when_a_default_name_is_missing():
    seeded_user = FakeUser(seeded_at=datetime.now(timezone.utc))
    db = FakeSession(seeded_user, existing_names=['Housing'])

    added = asyncio.run(ensure_default_categories(db, user_id=42))

    assert added == 0
    assert db.added == []
    assert db.flush_calls == 0
    assert db.execute_calls == 0
    assert db.get_calls == [('User', 42)]


def test_unseeded_user_gets_defaults_once_and_is_marked_seeded():
    user = FakeUser(seeded_at=None)
    db = FakeSession(user, existing_names=[])

    added = asyncio.run(ensure_default_categories(db, user_id=7))

    assert added == len(DEFAULT_CATEGORIES)
    assert len(db.added) == len(DEFAULT_CATEGORIES)
    assert db.flush_calls == 1
    assert user.default_categories_seeded_at is not None
