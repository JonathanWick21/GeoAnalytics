# GeoAnalytics

MVP de **GEO** (Generative Engine Optimization): mide si una marca aparece en respuestas de un LLM ante preguntas reales del sector.

Auth con cookie, workspaces, projects y auditorías persistidas. Empezamos con **Google Gemini**.

> Reconstruido desde cero para aprender / portfolio. No es un fork de ninguna plataforma de empresa.

## Demo

| Pieza | URL |
|-------|-----|
| Front | https://geoanalytics-web.vercel.app |
| API | https://geoanalytics-api.fly.dev |
| Health | https://geoanalytics-api.fly.dev/health |

Flujo: registrarse → workspace → project (marca + URL) → lanzar auditoría → ver detalle.

## Stack

| Capa | Tech |
|------|------|
| API | FastAPI + Uvicorn |
| DB | PostgreSQL (Neon en prod) + SQLAlchemy 2 |
| Auth | Cookie httpOnly JWT (`geo_session`) + argon2 (`pwdlib`) |
| Crawl | httpx (+ Playwright si hace falta) |
| AI | Gemini (REST via `httpx`) |
| Front | Next.js (App Router) + TypeScript |
| Hosting | Vercel (front) + Fly.io (API) + Neon (DB) |

## Flujo

```text
Browser (Next.js)
   │  cookie geo_session + credentials: "include"
   ▼
FastAPI
   ├── auth / workspaces / projects / audits
   ├── PostgreSQL
   ├── crawl de la URL del project
   └── Gemini → prompts del sector → tasa de mención
```

## Layout

```text
GeoAnalytics/
├── backend/     # FastAPI
└── web/         # Next.js
```

## Setup local

Requisitos: Python 3.12+, Node.js 20+, Docker Desktop.

```bash
# DB
cd backend && docker compose up -d

# API
python -m venv ../.venv
# Windows: ..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8080

# Front
cd ../web
npm install
npm run dev
```

Variables de entorno del backend (ver `.env.example`):

```env
DATABASE_URL=postgresql+psycopg://geo:geo@127.0.0.1:5432/geoanalytics
AUTH_JWT_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
ENV=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
COOKIE_SECURE=0
MAX_AUDITS_PER_DAY=4
```

Front (`web/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Producción

```text
Browser → Vercel (Next.js)
              │  cookie geo_session (Secure + SameSite=None)
              ▼
         Fly.io (FastAPI + Playwright)
              ├── Neon Postgres
              └── Gemini API
```

Secrets del API (`ENV=production`, `COOKIE_SECURE=1`, `CORS_ORIGINS` = origen del front, `DATABASE_URL`, `AUTH_JWT_SECRET`, `GEMINI_API_KEY`, …).

Front: `NEXT_PUBLIC_API_URL=https://geoanalytics-api.fly.dev`  
Root Directory en Vercel: `web`.

## License

Uso privado / portfolio salvo que se indique lo contrario.
