from sys import path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from contextlib import asynccontextmanager

from deps import get_current_user, get_owned_workspace
from schemas import WorkspaceOut, WorkspaceCreate
from database import Base, engine



@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="GeoAnalytics", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
from models import User, Workspace, Project
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
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True, #Con esto JS no puede leerla
        samesite="lax", #Mitiga CSRF básico en navegación
        secure=False, #True en producción con HTTPS
        max_age= 30 * 24 * 3600,
        path="/"
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
    response.delete_cookie(COOKIE_NAME, path="/")
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