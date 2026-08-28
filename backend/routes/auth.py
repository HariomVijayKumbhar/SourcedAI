import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from services.auth import create_user, authenticate_user, create_token

logger = logging.getLogger(__name__)
router = APIRouter()


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    existing = authenticate_user(payload.username, payload.password)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    from services.database import get_user_by_username
    if get_user_by_username(payload.username):
        raise HTTPException(status_code=409, detail="Username already exists")
    try:
        user = create_user(payload.username, payload.password)
        token = create_token(user["id"], user["username"])
        return AuthResponse(token=token, user={"id": user["id"], "username": user["username"]})
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create account")


@router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token(user["id"], user["username"])
    return AuthResponse(token=token, user={"id": user["id"], "username": user["username"]})
