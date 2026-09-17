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