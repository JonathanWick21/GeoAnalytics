from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length = 0)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str

    model_config = {"from_attributes": True}

class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class WorkspaceOut(BaseModel):
    id: int
    name: str
    owner_id: int

    model_config = {"from_attributes": True}

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=1, max_length=500)

class ProjectOut(BaseModel):
    id: int
    workspace_id: int
    name: str
    url: str

    model_config = {"from_attributes": True}