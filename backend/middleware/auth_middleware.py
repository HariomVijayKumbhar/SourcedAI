from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services.passcode import verify_token

security = HTTPBearer(auto_error=False)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_session_id(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """Extracts and validates the bearer token, returning the session_id inside it.

    The token is an HMAC-signed payload issued by /api/auth/passcode.
    """
    if creds is None or not creds.credentials:
        raise _unauthorized("Missing access token")
    payload = verify_token(creds.credentials)
    if not payload:
        raise _unauthorized("Invalid or expired access token")
    return str(payload["sid"])
