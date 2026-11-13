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

## Qué hace hoy

- Register / login / logout / sesión
- Workspaces y projects (marca + URL)
- Auditoría: crawl → genera preguntas del sector → pregunta a Gemini → detecta si menciona la marca
- Límite diario de auditorías por usuario (`MAX_AUDITS_PER_DAY`)
- Front: listado + detalle de auditoría

## Qué no es (aún)

- Multi-motor real (ChatGPT / Claude en vivo)
- Cola en background (Celery): la auditoría corre en el request
- Billing / planes

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

Rellena `.env` (nunca lo subas al repo). Mínimo:

```env
DATABASE_URL=postgresql+psycopg://geo:geo@127.0.0.1:5432/geoanalytics
AUTH_JWT_SECRET=cambia_esto_por_uno_largo
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

Opcional / producción:

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

Abre http://localhost:3000 — usa **localhost** (no `127.0.0.1`) para que la cookie cuadre con la API.

## Demo rápida

1. Regístrate / login  
2. Crea workspace → project (nombre + URL)  
3. Lanza auditoría → abre el detalle  

## Lecciones útiles

- `create_all` no migra tablas viejas → a veces hace falta `DROP TABLE` en local
- Cookie entre puertos: mismo host (`localhost` ≠ `127.0.0.1`)
- `Depends(get_db)` pasa la función, no `get_db()`
- Los model ids de Gemini cambian; si 404, prueba otro en `GEMINI_MODEL`
- Secrets solo en `.env` / el panel del host, nunca en el README

## Producción (checklist)

- `ENV=production` (oculta `/docs`)
- `COOKIE_SECURE=1` (HTTPS)
- `AUTH_JWT_SECRET` fuerte (obligatorio)
- `CORS_ORIGINS` = URL real del front
- `NEXT_PUBLIC_API_URL` = URL real del API

## License

Uso privado / portfolio salvo que se indique lo contrario.
