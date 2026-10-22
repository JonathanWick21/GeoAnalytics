# GeoAnalytics

Personal GEO (Generative Engine Optimization) MVP rebuilt from scratch for learning and portfolio.

Audits how visible a brand might be inside generative AI answers (starting with **Google Gemini**), with auth, workspaces, projects and persisted audit results.

> Rebuilt step by step while studying concepts from a prior internship GEO platform — this repo is an independent implementation, not a company fork.

## Stack

| Layer | Tech |
|-------|------|
| API | Python, FastAPI, Uvicorn |
| DB | PostgreSQL 15 + SQLAlchemy 2 + Docker |
| Auth | httpOnly cookie JWT (`geo_session`), argon2 passwords (`pwdlib`) |
| AI | Gemini (`httpx` → Generative Language API) |
| Web | Next.js (App Router), TypeScript |

## Architecture

```text
Browser (Next.js :3000)
    │  cookie geo_session + credentials: include
    ▼
FastAPI (:8080)
    ├── Auth / workspaces / projects / audits
    ├── PostgreSQL
    └── Gemini (on POST /projects/{id}/audits)
```

## Features (current MVP)

- Register / login / logout / session (`/auth/*`)
- Workspaces CRUD (owned by user)
- Projects per workspace (name + URL)
- Start audit → Gemini returns structured JSON (SoV estimate, summary, recommendations)
- Dashboard lists workspaces → projects → audits

## What this is not (yet)

- Not a multi-engine live query (ChatGPT/Claude scores are **model estimates** in one Gemini prompt)
- No Celery/background workers (audit runs in the request)
- No Stripe / landing / plan quotas
- No site crawler grounding (brand context is name + URL + model knowledge)

## Project layout

```text
GeoAnalytics/
├── backend/          # FastAPI
│   ├── main.py
│   ├── models.py
│   ├── gemini_client.py
│   ├── docker-compose.yaml
│   └── .env.example
└── web/              # Next.js dashboard
    └── src/app/
```

## Setup

### Prerequisites

- Python 3.12+ (developed on 3.14)
- Node.js 20+
- Docker Desktop (PostgreSQL)

### 1. Database

```bash
cd backend
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv ../.venv
```

Windows (desde `backend/`, con el venv en `GeoAnalytics/.venv`):

```powershell
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8080
```

Required `.env` keys (see `.env.example`):

- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (e.g. `gemini-3.8-flash` or `gemini-flash-latest` — some older model ids return 404 for new API keys)

API docs: http://localhost:8080/docs

### 3. Frontend

```bash
cd web
npm install
npm run dev
```

Create `web/.env.local` if needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Open http://localhost:3000 — use **localhost** (not `127.0.0.1`) so the session cookie works with the API.

## Learning notes

Useful lessons from building this:

- `create_all` does **not** migrate existing tables → local `DROP TABLE` when models change
- Cookie auth across ports needs the **same host** (`localhost` vs `127.0.0.1`)
- FastAPI `Depends(get_db)` must pass the function, not `get_db()`
- Gemini model ids change; ListModels ≠ generateContent availability
- Keep secrets in `.env`, never commit them

## Possible next steps

- Background audits (Celery + Redis)
- Crawl the project URL and ground the prompt
- Richer results UI
- CSRF for cookie mutations (like production GEO apps)

## License

Private / portfolio use unless stated otherwise.
