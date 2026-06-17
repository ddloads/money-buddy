# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Buddy is a full-stack personal finance SPA covering bill management, income tracking, and spending analytics. The stack is:

- **Backend:** FastAPI (Python 3.11) + SQLAlchemy 2 async + PostgreSQL 16 + Alembic
- **Frontend:** React 18 + Vite + Tailwind CSS + TanStack Query + Zustand
- **Infrastructure:** Docker Compose with nginx (frontend), uvicorn (backend), and a separate reminder-worker container

The app is deployed via Portainer as a single `docker-compose.yml` stack.

## Development Commands

### With Docker (recommended)

```bash
cp backend/.env.example backend/.env   # then fill in real values
docker compose up --build
```

App is at `http://localhost:3107`.

### Without Docker

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # :3000, but Vite proxy target must be changed to http://localhost:8000
```

The Vite proxy in `vite.config.js` defaults to `http://backend:8000` (Docker hostname). For local non-Docker dev, change the proxy target to `http://localhost:8000`.

### Frontend scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run lint       # ESLint check
npm run preview    # preview production build locally
```

### Tests

**Frontend** (Node.js built-in test runner, no extra deps):
```bash
cd frontend
node --test tests/billCache.test.mjs
node --test tests/billDates.test.mjs
node --test tests/billList.test.mjs
node --test tests/billPayload.test.mjs
```

**Backend** (pytest):
```bash
cd backend
pytest tests/
pytest tests/test_contracts.py   # API contract tests
```

### Database migrations

`main.py` calls `Base.metadata.create_all` on startup. For new columns on existing tables, `ADD COLUMN IF NOT EXISTS` statements are run in the lifespan event and can also be triggered via `POST /dev/migrate`. For proper schema versioning:

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Architecture

### Request lifecycle

```
Browser → nginx (:3107 → :80)
  ├── /api/*    → proxy → uvicorn (:8000) → FastAPI
  ├── /uploads/* → nginx static (shared Docker volume)
  └── /*         → React SPA (index.html)
```

### Backend layout (`backend/app/`)

| Path | Purpose |
|---|---|
| `core/config.py` | Pydantic-settings; reads `.env`. All config via `settings.*`. |
| `core/database.py` | Async SQLAlchemy engine + `AsyncSession`. Injected via `Depends(get_db)`. |
| `core/security.py` | JWT creation/validation + bcrypt helpers. |
| `api/deps.py` | `get_current_user` dependency — resolves JWT → User ORM object. |
| `api/auth.py` | Register, login (form data), Google OAuth, `/me` GET/PUT/DELETE, change password, logout |
| `api/bills.py` | Bills CRUD, mark paid/unpay, receipt upload/delete, export, payoff estimate, payment history |
| `api/categories.py` | Category CRUD |
| `api/budget.py` | Monthly budget vs. actual: `GET /budget?year=&month=`. Budgets are the recurring `monthly_budget` on each category; "spent" is bills due in the month. |
| `api/dashboard.py` | Split endpoints: `/summary`, `/upcoming`, `/monthly`, `/categories`, `/yearly`, `/income-vs-expenses`, `/paycheck-plan`, `/debt` |
| `api/income.py` | Income source CRUD |
| `api/templates.py` | Bill template CRUD |
| `models/` | SQLAlchemy ORM: `User`, `Bill`, `Category`, `Income`, `Payment`, `BillTemplate` |
| `schemas/` | Pydantic v2 request/response models |
| `services/appwrite.py` | Optional Appwrite cloud storage for receipts; falls back to local disk |
| `services/default_categories.py` | Seeds default categories for new users |
| `services/email.py` | SMTP email sending |
| `services/reminders.py` | Runs in `reminder-worker` container — polls unpaid bills, sends due-date emails. Interval controlled by `REMINDER_INTERVAL_SECONDS` env var (default 86400s). |

All route handlers use `async def` with `AsyncSession`. Pattern: `await db.execute(select(...))` then `await db.commit()`.

Every protected endpoint takes `current_user: User = Depends(get_current_user)` as the last parameter. User data is always scoped — never query without `where(Model.user_id == current_user.id)`.

Router prefixes are set in `main.py` (`/auth`, `/bills`, `/categories`, `/budget`, `/dashboard`, `/income`, `/templates`) — route decorators use paths without that prefix.

### Frontend layout (`frontend/src/`)

| Path | Purpose |
|---|---|
| `utils/api.js` | Axios instance (`baseURL: /api`). Injects JWT from `localStorage` (`mb_token`). 401 clears storage and redirects to `/login`. Exports `authAPI`, `billsAPI`, `categoriesAPI`, `dashboardAPI`, `incomeAPI`, `templatesAPI`. |
| `utils/billCache.js` | Normalized cache update helpers for TanStack Query |
| `utils/billDates.js` | Date/timezone handling utilities |
| `utils/billList.js` | Bill list filtering, sorting, pagination helpers |
| `utils/billPayload.js` | Bill object normalization before API calls |
| `utils/currency.js` | Currency formatting; reads user's `currency` preference |
| `store/authStore.js` | Zustand store with `persist`. Holds `user`, `token`, `darkMode`. Call `setAuth(user, token)` after login; `logout()` to clear. `initTheme()` called in `App.jsx` on mount. |
| `hooks/` | TanStack Query hooks per domain: `useBills`, `useCategories`, `useDashboard`, `useAuth`, `useIncome`, `useTemplates`, `useCurrency`. Mutations call `queryClient.invalidateQueries` to refresh. |
| `pages/` | Route-level components. `GoogleCallback.jsx` extracts JWT from `?token=` and calls `setAuth`. `Income.jsx` and `Settings.jsx` are newer additions. |
| `components/` | Shared UI including `BillForm`, `IncomeForm`, `MonthlyChart`, `YearlyChart`, `IncomeVsExpensesChart`, `UpcomingBills`, `BillCard`, `StatCard` |

### Authentication

Two methods, both produce a JWT:

1. **Username/password** — `POST /auth/login` (form data: `username` + `password`) returns `{ access_token, token_type }`.
2. **Google OAuth** — browser navigates to `/api/auth/google` → Google → `/api/auth/google/callback` → backend redirects to `/auth/callback?token={jwt}` → `GoogleCallback.jsx` stores it.

JWT is stored in `localStorage` as `mb_token` and also in Zustand's persisted store (`mb_auth`). The axios interceptor reads directly from `localStorage` to avoid import cycles.

Additional auth endpoints: `PUT /auth/me` (update profile), `PUT /auth/me/password` (change password), `DELETE /auth/me` (delete account), `POST /auth/logout`.

### Data models

**User:** `id, email (unique), username, hashed_password, google_id, is_active, currency (default 'USD'), notif_email_reminders, notif_overdue_alerts, notif_weekly_summary, default_categories_seeded_at`

**Bill:** `id, user_id, name, amount (Numeric 12,2), due_date, is_paid, paid_at, receipt_path, receipt_url (Appwrite URL), is_recurring, recurrence_interval (enum: daily/weekly/biweekly/monthly/quarterly/yearly), category_id, notes, autopay_enabled, interest_rate (Numeric 5,2), remaining_balance (Numeric 12,2), created_at, updated_at`

**Category:** `id, user_id, name, color (hex), icon, monthly_budget (Numeric 12,2)`

**Income:** `id, user_id, source_name, amount, frequency (enum: WEEKLY/BIWEEKLY/MONTHLY/QUARTERLY/YEARLY/ONE_TIME), start_date, end_date, is_active, notes, created_at, updated_at`

**Payment:** `id, bill_id, user_id, amount, paid_at, notes`

**BillTemplate:** `id, user_id, name, amount, category_id, notes, is_recurring, recurrence_interval`

User → Bills, Categories, Income cascade-delete.

### Receipt handling

Receipts support two storage backends — whichever is configured takes precedence:

1. **Appwrite (cloud):** Requires `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_STORAGE_BUCKET`, `APPWRITE_STORAGE_FILE_COLLECTION` env vars. URL stored in `bill.receipt_url`.
2. **Local disk:** `UPLOAD_DIR/{user_id}_{bill_id}_{uuid}.{ext}` (JPEG, PNG, GIF, WebP, PDF; max 10 MB). Path stored in `bill.receipt_path`. Served by nginx at `/uploads/*` — not proxied through FastAPI.

Old receipt is deleted before saving the new one. Falls back to local if Appwrite is unconfigured or fails.

Upload: `POST /bills/{id}/receipt` (multipart/form-data, field `receipt`).

### Dashboard endpoints

All under `/dashboard`:

| Endpoint | Returns |
|---|---|
| `/summary` | Aggregated totals (total bills, paid, unpaid, total amount) |
| `/upcoming` | Bills due within N days (query param) |
| `/monthly` | 12-month bill breakdown |
| `/categories` | Spending by category |
| `/yearly` | Year-over-year aggregates |
| `/income-vs-expenses` | Monthly income vs. expenses (6-month window) |

### Dark mode

Tailwind `darkMode: 'class'` strategy. The `dark` class is toggled on `document.documentElement`. State in Zustand (`darkMode`). `initTheme()` must be called once on startup.

### Bills list pagination

`GET /bills` accepts `page` (1-based) and `page_size` params. Response: `{ total, page, page_size, pages, items }`.

## Key conventions

- **Backend:** All DB queries are async. Never use a synchronous session. Commit explicitly after mutations; rollback on exception.
- **Backend:** Swagger UI at `/docs`, ReDoc at `/redoc` during development.
- **Backend:** `/dev/migrate` endpoint (`POST`) triggers manual column migrations — useful when the DB schema is behind the model without a full Alembic migration.
- **Frontend:** API calls go through `utils/api.js` — never create a raw `axios` instance elsewhere.
- **Frontend:** Server state lives in TanStack Query; only auth + dark mode preference live in Zustand.
- **Frontend:** `utils/billCache.js`, `utils/billDates.js`, `utils/billList.js`, `utils/billPayload.js` contain shared logic extracted from components — use these before duplicating date or list logic.
- **Frontend:** Vendor, charts (Recharts), and TanStack Query are split into separate chunks in the production build (`vite.config.js` `manualChunks`).
- **Infrastructure:** The `smtp-relay-net` Docker network is external — it must exist on the host before `docker compose up`. The reminder-worker shares this network for centralized SMTP routing.
