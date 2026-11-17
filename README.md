# GeoAnalytics

MVP de **GEO** (Generative Engine Optimization): mide si una marca aparece en respuestas de un LLM ante preguntas reales del sector.

Auth con cookie, workspaces, projects y auditorías persistidas. Empezamos con **Google Gemini**.

> Reconstruido desde cero para aprender / portfolio. No es un fork de ninguna plataforma de empresa.

## Stack

| Capa | Tech |
|------|------|
| API | FastAPI + Uvicorn |
| DB | PostgreSQL 15 + SQLAlchemy 2 + Docker |
| Auth | Cookie httpOnly JWT (`geo_session`) + argon2 (`pwdlib`) |
| Crawl | httpx (+ Playwright si hace falta) |
| AI | Gemini (REST via `httpx`) |
| Front | Next.js (App Router) + TypeScript |

## Flujo

```text
Browser (Next.js :3000)
   │  cookie geo_session + credentials: "include"
   ▼
FastAPI (:8080)
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

### Requisitos

- Python 3.12+
- Node.js 20+
- Docker Desktop

### 1. Postgres

```bash
cd backend
docker compose up -d
```

### 2. Backend

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8080
```

Variables mínimas en `.env` (ver también `.env.example`):

```env
DATABASE_URL=postgresql+psycopg://geo:geo@127.0.0.1:5432/geoanalytics
AUTH_JWT_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

Opcionales:

```env
ENV=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
COOKIE_SECURE=0
MAX_AUDITS_PER_DAY=4
```

Health: http://localhost:8080/health  
Docs (solo si `ENV` ≠ `production`): http://localhost:8080/docs

### 3. Front

```bash
cd web
npm install
npm run dev
```

`web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Abrir http://localhost:3000. Conviene usar el mismo host que la API (`localhost` vs `127.0.0.1`) para que la cookie de sesión coincida.

## Demo rápida

1. Registrarse / login  
2. Crear workspace → project (nombre + URL)  
3. Lanzar auditoría → abrir el detalle  

## Deploy (producción)

Demo pública:

| Pieza | Host | URL |
|-------|------|-----|
| Front | Vercel | https://geoanalytics-web.vercel.app |
| API | Fly.io | https://geoanalytics-api.fly.dev |
| DB | Neon (Postgres) | (connection string en secrets) |

Health API: https://geoanalytics-api.fly.dev/health  
Health DB: https://geoanalytics-api.fly.dev/health/db  

Stack de producción: **Neon + Fly + Vercel** (Railway se descartó por trial caducado).

### Arquitectura en prod

```text
Browser → Vercel (Next.js)
              │  cookie geo_session (Secure + SameSite=None)
              ▼
         Fly.io (FastAPI + Playwright)
              ├── Neon Postgres
              └── Gemini API
```

### Variables en el API (Fly secrets)

```text
DATABASE_URL          # Neon (postgresql://…; el backend lo normaliza a +psycopg)
AUTH_JWT_SECRET       # largo, obligatorio con ENV=production
GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
ENV=production
COOKIE_SECURE=1       # activa Secure + SameSite=None
CORS_ORIGINS=https://geoanalytics-web.vercel.app
MAX_AUDITS_PER_DAY=4
GEO_DEMO=0
```

### Variables en el front (Vercel)

```text
NEXT_PUBLIC_API_URL=https://geoanalytics-api.fly.dev
```

### Redesplegar

API (desde `backend/`):

```bash
fly deploy --app geoanalytics-api --remote-only --primary-region cdg -y
```

Secrets:

```bash
fly secrets set --app geoanalytics-api KEY=value
```

Front (desde `web/`):

```bash
vercel deploy --prod --yes
```

Root Directory del proyecto en Vercel: `web` (el monorepo tiene el Next en esa carpeta).

Config relevante en el repo: `backend/Dockerfile`, `backend/fly.toml`, `backend/railway.toml` (legado, no usado).

### Checklist prod

- `ENV=production` (oculta `/docs`)
- `COOKIE_SECURE=1` (HTTPS + cookie cross-domain)
- `AUTH_JWT_SECRET` fuerte
- `CORS_ORIGINS` = origen exacto del front (sin barra final)
- `NEXT_PUBLIC_API_URL` = URL del API
- Deployment Protection de Vercel desactivada si el sitio debe ser público

## Lecciones útiles

- `create_all` no migra tablas viejas → a veces hace falta `DROP TABLE` en local
- Cookie entre puertos: mismo host (`localhost` ≠ `127.0.0.1`)
- Cookie cross-domain (Vercel ↔ Fly): `SameSite=None` + `Secure`
- `Depends(get_db)` pasa la función, no `get_db()`
- Los model ids de Gemini cambian; si 404, probar otro en `GEMINI_MODEL`
- Secrets en `.env` / Fly secrets / Vercel env, no en el repo

## License

Uso privado / portfolio salvo que se indique lo contrario.
