<div align="center">

# 💰 Money Buddy

**A clean, mobile-first bill management app to keep your finances organized.**

Track bills, mark them paid, get reminders before due dates, and see where your money goes every month.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## ✨ Features

| Feature | Details |
|---|---|
| 📋 **Bill Tracking** | Add recurring and one-time bills with amounts, due dates, and notes |
| ✅ **Pay/Unpay** | One-click mark as paid with full payment history |
| 📂 **Categories** | Organize bills with custom categories, colors, and icons |
| 📊 **Dashboard** | Monthly overview, spending totals, and upcoming bills at a glance |
| 📈 **Charts** | 12-month spending bar chart to spot patterns |
| 📎 **Receipts** | Attach images or PDFs to any bill |
| 🔔 **Reminders** | Email alerts before bills come due (configurable days in advance) |
| 🔐 **Auth** | Register/login with username & password or Google OAuth |
| 🌙 **Dark Mode** | Easy on the eyes, persisted across sessions |
| 📱 **Mobile-First** | Fully responsive — works great on phone, tablet, and desktop |

---

## 🏗️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com) — async Python API framework
- [PostgreSQL 16](https://www.postgresql.org) — primary database
- [SQLAlchemy 2](https://www.sqlalchemy.org) — async ORM
- [Alembic](https://alembic.sqlalchemy.org) — database migrations
- [Authlib](https://authlib.org) — Google OAuth
- [python-jose](https://python-jose.readthedocs.io) — JWT tokens
- [passlib + bcrypt](https://passlib.readthedocs.io) — password hashing

**Frontend**
- [React 18](https://react.dev) + [Vite](https://vitejs.dev) — fast, modern UI
- [Tailwind CSS](https://tailwindcss.com) — utility-first styling
- [TanStack Query](https://tanstack.com/query) — server state management
- [Zustand](https://zustand-demo.pmnd.rs) — client auth state
- [Recharts](https://recharts.org) — spending charts
- [React Hook Form](https://react-hook-form.com) — form handling
- [Heroicons](https://heroicons.com) — icon set

**Infrastructure**
- [Docker Compose](https://docs.docker.com/compose) — multi-container stack
- [nginx](https://nginx.org) — static file serving + API reverse proxy
- [Portainer](https://www.portainer.io) — Docker stack management

---

## 🚀 Deploying with Portainer

This app ships as a single `docker-compose.yml` — deploy it directly from GitHub in Portainer.

### 1. Add a New Stack

1. Open **Portainer** → **Stacks** → **+ Add stack**
2. Give it a name: `money-buddy`
3. Select **Repository** as the build method
4. Fill in:

| Field | Value |
|---|---|
| Repository URL | `https://github.com/ddloads/money-buddy` |
| Repository reference | `refs/heads/master` |
| Compose path | `docker-compose.yml` |

### 2. Set Environment Variables

Add these in the **Environment variables** section:

| Variable | Required | Description | Example |
|---|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | Database password | `s3cur3p@ss!` |
| `SECRET_KEY` | ✅ | JWT signing key — make it long and random | `a8f3k2...` |
| `APP_PORT` | ✅ | Host port to expose the app on | `3000` |
| `FRONTEND_URL` | ✅ | Your app's public URL (used in emails) | `http://192.168.1.100:3000` |
| `GOOGLE_CLIENT_ID` | ☐ | Google OAuth — from Google Cloud Console | |
| `GOOGLE_CLIENT_SECRET` | ☐ | Google OAuth secret | |
| `GOOGLE_REDIRECT_URI` | ☐ | OAuth callback URL | `http://your-host/api/auth/google/callback` |
| `SMTP_HOST` | ☐ | SMTP server for email reminders | `smtp.gmail.com` |
| `SMTP_PORT` | ☐ | SMTP port | `587` |
| `SMTP_USER` | ☐ | SMTP username | `you@gmail.com` |
| `SMTP_PASSWORD` | ☐ | SMTP password / app password | |
| `REMINDER_DAYS_BEFORE` | ☐ | Days before due date to send reminder | `3` |

### 3. Deploy

Click **Deploy the stack**. Portainer will clone the repo, build both images, and start all three containers (`db`, `backend`, `frontend`).

Visit `http://your-host:APP_PORT` and register your first account. 🎉

> **Tip:** Enable **Auto update** in Portainer with a polling interval so the stack redeploys automatically whenever you push to `master`.

---

## 🛠️ Local Development

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (easiest), **or**
- Python 3.11+, Node.js 20+, PostgreSQL 16

### With Docker Compose

```bash
git clone https://github.com/ddloads/money-buddy.git
cd money-buddy

# Create your env file
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

docker compose up --build
```

App will be at `http://localhost` (or whatever `APP_PORT` you set).

### Without Docker (manual)

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in DATABASE_URL, SECRET_KEY, etc.
uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal):

```bash
cd frontend
npm install
npm run dev                     # runs on :3000, proxies /api to :8000
```

Open `http://localhost:3000`.

---

## 📁 Project Structure

```
money-buddy/
├── docker-compose.yml          # ← Portainer deploys this
│
├── backend/
│   ├── app/
│   │   ├── api/                # Route handlers
│   │   │   ├── auth.py         # Register, login, Google OAuth
│   │   │   ├── bills.py        # Bills CRUD + pay/unpay + receipt upload
│   │   │   ├── categories.py   # Category management
│   │   │   ├── dashboard.py    # Stats & monthly summary
│   │   │   └── deps.py         # Shared dependencies (auth guard)
│   │   ├── core/
│   │   │   ├── config.py       # Settings (pydantic-settings + .env)
│   │   │   ├── database.py     # Async SQLAlchemy engine & session
│   │   │   └── security.py     # JWT & bcrypt helpers
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   └── services/
│   │       ├── email.py        # SMTP email sender
│   │       └── reminders.py    # Due-date reminder logic
│   ├── alembic/                # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout, BillCard, StatCard, Charts...
│   │   ├── pages/              # Dashboard, Bills, BillDetail, Categories, Settings, Login, Register
│   │   ├── hooks/              # TanStack Query data hooks
│   │   ├── store/              # Zustand auth store
│   │   └── utils/api.js        # Axios client with JWT injection
│   ├── Dockerfile              # Multi-stage: build → nginx
│   ├── nginx.conf              # Serves static files, proxies /api
│   └── package.json
│
└── uploads/                    # Receipt file storage (Docker volume)
```

---

## 🔌 API Reference

Interactive docs available at `http://your-host/docs` (Swagger UI) once the app is running.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/auth/google` | Start Google OAuth flow |
| `GET` | `/auth/me` | Current user profile |
| `GET` | `/bills` | List bills (paginated, filterable) |
| `POST` | `/bills` | Create a bill |
| `PUT` | `/bills/{id}` | Update a bill |
| `DELETE` | `/bills/{id}` | Delete a bill |
| `POST` | `/bills/{id}/pay` | Mark as paid |
| `POST` | `/bills/{id}/unpay` | Mark as unpaid |
| `POST` | `/bills/{id}/receipt` | Upload receipt file |
| `GET` | `/categories` | List categories |
| `POST` | `/categories` | Create category |
| `GET` | `/dashboard` | Stats, upcoming bills, monthly chart data |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT © [ddloads](https://github.com/ddloads)
