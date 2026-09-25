from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse
    permissions: List[str]


class TokenPayload(BaseModel):
    sub: str
    tenant_id: str
    role: str
    email: str
    exp: int
