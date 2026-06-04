# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Buddy is a full-stack bill management SPA. The stack is:

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

App is at `http://localhost` (port controlled by `APP_PORT` env var).

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
npm run dev        # :3000, proxies /api → :8000
```

### Frontend scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run lint       # ESLint check
npm run preview    # preview production build locally
```

### Database migrations

Alembic is wired up but migrations are not auto-generated — `main.py` calls `Base.metadata.create_all` on startup for dev convenience. For schema changes, generate and apply Alembic migrations:

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Architecture

### Request lifecycle

```
Browser → nginx (:80)
  ├── /api/*    → proxy → uvicorn (:8000) → FastAPI
  ├── /uploads/* → nginx static (shared Docker volume)
  └── /*         → React SPA (index.html)
```

### Backend layout (`backend/app/`)

| Path | Purpose |
|---|---|
| `core/config.py` | Pydantic-settings; reads `.env`. All config is accessed via `settings.*`. |
| `core/database.py` | Async SQLAlchemy engine + `AsyncSession`. DB session injected via `Depends(get_db)`. |
| `core/security.py` | JWT creation/validation + bcrypt helpers. |
| `api/deps.py` | `get_current_user` dependency — resolves JWT → User ORM object. Used on every protected route. |
| `api/auth.py` | Register, login (form data), Google OAuth, `/me` |
| `api/bills.py` | Bills CRUD, mark paid/unpay, receipt upload/delete |
| `api/categories.py` | Category CRUD |
| `api/dashboard.py` | Aggregated stats, upcoming bills, 12-month chart data |
| `models/` | SQLAlchemy ORM: `User`, `Bill`, `Category` |
| `schemas/` | Pydantic v2 request/response models |
| `services/email.py` | SMTP email sending |
| `services/reminders.py` | Runs in the `reminder-worker` container — polls unpaid bills and sends due-date emails |

All route handlers use `async def` with `AsyncSession`. Pattern: `await db.execute(select(...))` then `await db.commit()`.

Every protected endpoint takes `current_user: User = Depends(get_current_user)` as the last parameter. User data is always scoped — never query without `where(Model.user_id == current_user.id)`.

### Frontend layout (`frontend/src/`)

| Path | Purpose |
|---|---|
| `utils/api.js` | Axios instance (`baseURL: /api`). Request interceptor injects JWT from `localStorage` (`mb_token`). 401 response clears storage and redirects to `/login`. Also exports typed API clients: `authAPI`, `billsAPI`, `categoriesAPI`, `dashboardAPI`. |
| `store/authStore.js` | Zustand store with `persist` middleware. Holds `user`, `token`, `darkMode`. Call `setAuth(user, token)` after login; `logout()` to clear. `initTheme()` is called in `App.jsx` on mount to sync dark mode to `document.documentElement`. |
| `hooks/` | TanStack Query hooks — one file per domain (`useBills`, `useCategories`, `useDashboard`, `useAuth`). Mutations call `queryClient.invalidateQueries` to refresh. |
| `pages/` | Route-level components. `GoogleCallback.jsx` extracts the JWT from the URL query param (`?token=`) and calls `setAuth`. |
| `components/` | Shared UI: `Layout`, `BillCard`, `StatCard`, `MonthlyChart`, `UpcomingBills`, `BillForm` |

### Authentication

Two methods, both produce a JWT:

1. **Username/password** — `POST /auth/login` (form data: `username` + `password`) returns `{ access_token, token_type }`.
2. **Google OAuth** — browser navigates to `/api/auth/google` → Google → `/api/auth/google/callback` → backend redirects to `/auth/callback?token={jwt}` → `GoogleCallback.jsx` stores it.

JWT is stored in `localStorage` as `mb_token` and also duplicated in Zustand's persisted store (`mb_auth`). The axios interceptor reads directly from `localStorage` to avoid import cycles.

### Data models

**User:** `id, email (unique), username (unique, nullable), hashed_password (nullable), google_id, is_active`

**Bill:** `id, user_id, name, amount (Numeric 12,2), due_date, is_paid, paid_at, receipt_path, is_recurring, recurrence_interval (enum: daily/weekly/biweekly/monthly/quarterly/yearly), category_id (nullable), notes`

**Category:** `id, user_id, name, color (hex string), icon (string)`

User → Bills and User → Categories are cascade-deleted.

### Receipt handling

- Uploaded via `POST /bills/{id}/receipt` (multipart/form-data, field name `receipt`)
- Stored on disk at `UPLOAD_DIR/{user_id}_{bill_id}_{uuid}.{ext}` (JPEG, PNG, GIF, WebP, PDF; max 10 MB)
- Served by nginx at `/uploads/*` from the shared Docker volume — not proxied through FastAPI
- Old receipt file is deleted from disk before saving the new one

### Dark mode

Tailwind `darkMode: 'class'` strategy. The `dark` class is toggled on `document.documentElement`. State lives in Zustand (`darkMode`). `initTheme()` must be called once on app startup to sync the persisted preference.

### Bills list pagination

`GET /bills` accepts `page` (1-based) and `page_size` params. Response includes `total`, `page`, `page_size`, `pages`.

## Key conventions

- **Backend:** All DB queries are async. Never use a synchronous session. Commit explicitly after mutations; rollback on exception.
- **Backend:** Router prefix is set in `main.py` (`/auth`, `/bills`, `/categories`, `/dashboard`) — route decorators use paths without that prefix.
- **Backend:** Swagger UI available at `/docs`, ReDoc at `/redoc` during development.
- **Frontend:** API calls go through `utils/api.js` — never create a raw `axios` instance elsewhere.
- **Frontend:** Server state lives in TanStack Query; only auth + dark mode preference live in Zustand.
- **Frontend:** Vite proxies `/api` to `http://backend:8000` (Docker) or `http://localhost:8000` — configure in `vite.config.js`.
- **Frontend:** Vendor, charts (Recharts), and TanStack Query are split into separate chunks in the production build (`vite.config.js` `manualChunks`).
