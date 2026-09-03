import base64
import hashlib
import hmac
import json
import time
from typing import Optional

from config import get_settings


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign(payload_b64: str, secret: str) -> str:
    return _b64url_encode(
        hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
    )


def create_token(session_id: str, ttl_seconds: int = 7 * 24 * 3600) -> str:
    settings = get_settings()
    issued_at = int(time.time())
    payload = {
        "sid": session_id,
        "iat": issued_at,
        "exp": issued_at + ttl_seconds,
    }
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = _sign(payload_b64, settings.app_passcode)
    return f"{payload_b64}.{signature}"


def verify_token(token: str) -> Optional[dict]:
    if not token or "." not in token:
        return None
    settings = get_settings()
    payload_b64, signature = token.rsplit(".", 1)
    expected = _sign(payload_b64, settings.app_passcode)
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except Exception:
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload
