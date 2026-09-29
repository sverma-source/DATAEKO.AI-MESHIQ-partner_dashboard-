from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """
    Cookie-driven authentication response.
    Delivers user entity, assigned RBAC permissions, and session duration.
    The raw JWT is strictly delivered via HttpOnly, Secure, SameSite=Strict cookie.
    """
    user: UserResponse
    permissions: List[str]
    expires_in_minutes: int


# TokenPayload for internal JWT encoding and decoding
class TokenPayload(BaseModel):
    sub: str
    tenant_id: str
    role: str
    email: str
    auth_version: int
    exp: int


class AcceptInvitationRequest(BaseModel):
    token: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class GenericMessageResponse(BaseModel):
    message: str

