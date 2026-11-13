import os
from itertools import count

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from schemas import AuditOut
from deps import get_current_user, get_owned_workspace, get_owned_project
from schemas import WorkspaceOut, WorkspaceCreate
from database import Base, engine
from crawler import fetch_page_text
from gemini_client import run_geo_audit



@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


_is_prod = os.getenv("ENV", "development") == "production"
app = FastAPI(title="GeoAnalytics",
              version="0.1.0",
              lifespan=lifespan,
              docs_url=None if _is_prod else "/docs",
              redoc_url=None if _is_prod else "/redoc",
              openapi_url=None if _is_prod else "/openapi.json"
              )
_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
allow_origins = [o.strip() for o in _origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/db")
def health_db():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"database": "ok"}

@app.get("/")
def root():
    return {"name": "GeoAnalytics", "health": "/health", "docs": "/docs"}


from fastapi import Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Workspace, Project, Audit
from schemas import RegisterIn, LoginIn, UserOut, ProjectCreate, ProjectOut
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    COOKIE_NAME,
)

@app.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == body.email.lower()).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email = body.email.lower(),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/auth/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    cookie_secure = os.getenv("COOKIE_SECURE", "0") == "1"
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,  # JS no puede leerla
        # Cross-domain (Vercel → Railway) necesita SameSite=None + Secure
        samesite="none" if cookie_secure else "lax",
        secure=cookie_secure,
        max_age=30 * 24 * 3600,
        path="/",
    )
    return user

from fastapi import Cookie

@app.get("/auth/me", response_model=UserOut)
def me(
        db: Session = Depends(get_db),
        geo_session: str | None = Cookie(default=None, alias=COOKIE_NAME)
):
    if not geo_session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_access_token(geo_session)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@app.post("/auth/logout")
def logout(response: Response):
    cookie_secure = os.getenv("COOKIE_SECURE", "0") == "1"
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        samesite="none" if cookie_secure else "lax",
        secure=cookie_secure,
    )
    return {"ok": True}


#### Workspaces

@app.get("/workspaces", response_model=list[WorkspaceOut])
def list_workspaces(
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user)
):
    return (
        db.query(Workspace)
        .filter(Workspace.owner_id == user.id)
        .order_by(Workspace.owner_id.desc()).all()
    )

@app.post("/workspaces", response_model=WorkspaceOut, status_code=201)
def create_workspace(
        body: WorkspaceCreate,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user)
):
    ws = Workspace(name=body.name.strip(), owner_id=user.id)
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws

#### Projects

@app.get("/workspaces/{workspace_id}/projects", response_model=list[ProjectOut])
def list_projects(
        workspace: Workspace = Depends(get_owned_workspace),
        db: Session = Depends(get_db)
):
    return (
        db.query(Project)
        .filter(Project.workspace_id == workspace.id)
        .order_by(Project.id.desc())
        .all()
    )

@app.post(
    "/workspaces/{workspace_id}/projects",
    response_model=ProjectOut,
    status_code=201
)
def create_project(
        body: ProjectCreate,
        workspace: Workspace = Depends(get_owned_workspace),
        db: Session = Depends(get_db)
):
    project = Project(
        workspace_id=workspace.id,
        name=body.name.strip(),
        url=body.url.strip()
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


MAX_AUDITS_PER_DAY = int(os.getenv("MAX_AUDITS_PER_DAY", "4"))

@app.post("/projects/{project_id}/audits", response_model=AuditOut, status_code=201)
def start_audit(
    project_id: int,
    project: Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    since = datetime.now(timezone.utc) - timedelta(days=1)
    used = (
        db.query(Audit)
        .join(Project, Audit.project_id == Project.id)
        .join(Workspace, Project.workspace_id == Workspace.id)
        .filter(
            Workspace.owner_id == user.id, Audit.created_at >= since
        ).count()
    )
    if used >= MAX_AUDITS_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail=f"Límite diario de auditorías ({MAX_AUDITS_PER_DAY}). Intenta mañana."
        )

    audit = Audit(project_id=project.id, status="running")
    db.add(audit)
    db.commit()
    db.refresh(audit)

    try:
        crawl_warning = None
        try:
            page_text = fetch_page_text(project.url)
        except Exception as crawl_exc:
            page_text = ""
            crawl_warning = f"crawl: {crawl_exc}"
        audit.result = run_geo_audit(project.name, project.url, page_text)
        audit.result["source_chars"] = len(page_text)
        if crawl_warning:
            audit.result["crawl_warning"] = crawl_warning
            audit.result["grounded"] = False
        audit.status = "completed"
        audit.error = None
    except Exception as exc:
        audit.status = "failed"
        audit.result = None
        audit.error = f"gemini: {str(exc).split('?key=')[0]}"

    db.commit()
    db.refresh(audit)
    return audit

@app.get("/projects/{project_id}/audits", response_model=list[AuditOut])
def list_audits(
        project_id: int,
        project: Project = Depends(get_owned_project),
        db: Session = Depends(get_db)
):
    return (
        db.query(Audit)
        .filter(Audit.project_id == project_id)
        .order_by(Audit.id.desc())
        .all()
    )

@app.get("/audits/{audit_id}", response_model=AuditOut)
def get_audit(
        audit_id: int,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user)
):
    audit = db.get(Audit, audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    project = db.get(Project, audit.project_id)
    ws = db.get(Workspace, project.workspace_id) if project else None
    if not project or not ws or ws.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit