import hmac

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from config import get_settings
from services.passcode import create_token

router = APIRouter()


class PasscodeRequest(BaseModel):
    passcode: str
    session_id: str


class PasscodeResponse(BaseModel):
    token: str
    expires_in: int


@router.post("/auth/passcode", response_model=PasscodeResponse)
async def verify_passcode(payload: PasscodeRequest):
    settings = get_settings()
    if not hmac.compare_digest(payload.passcode or "", settings.app_passcode):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect passcode",
        )
    if not payload.session_id or len(payload.session_id) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session id",
        )
    return PasscodeResponse(
        token=create_token(payload.session_id, settings.access_token_ttl_seconds),
        expires_in=settings.access_token_ttl_seconds,
    )
