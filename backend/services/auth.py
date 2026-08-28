import os
import uuid
import hashlib
import hmac
import time
import json
import base64
import logging
from typing import Optional, Dict, Any
from config import get_settings

logger = logging.getLogger(__name__)

SECRET_KEY = None


def _get_secret() -> str:
    global SECRET_KEY
    if SECRET_KEY is None:
        settings = get_settings()
        SECRET_KEY = settings.jwt_secret
    return SECRET_KEY


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _base64url_decode(data: str) -> bytes:
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data.encode('ascii'))


def create_user(username: str, password: str) -> Dict[str, Any]:
    from services.database import create_user as db_create_user
    password_hash = _hash_password(password)
    return db_create_user(username, password_hash)


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    from services.database import get_user_by_username
    user = get_user_by_username(username)
    if not user:
        return None
    if not _verify_password(password, user["password_hash"]):
        return None
    return {"id": user["id"], "username": user["username"]}


def create_token(user_id: str, username: str) -> str:
    secret = _get_secret()
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": user_id,
        "username": username,
        "iat": now,
        "exp": now + 86400 * 7,
    }

    header_b64 = _base64url_encode(json.dumps(header, separators=(',', ':')).encode())
    payload_b64 = _base64url_encode(json.dumps(payload, separators=(',', ':')).encode())

    signing_input = f"{header_b64}.{payload_b64}"
    signature = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)

    return f"{signing_input}.{signature_b64}"


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        secret = _get_secret()
        parts = token.split('.')
        if len(parts) != 3:
            return None

        header_b64, payload_b64, signature_b64 = parts

        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
        expected_sig_b64 = _base64url_encode(expected_sig)

        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None

        payload_json = _base64url_decode(payload_b64)
        payload = json.loads(payload_json)

        if payload.get("exp", 0) < int(time.time()):
            return None

        return {"user_id": payload["sub"], "username": payload["username"]}
    except Exception:
        return None


def _hash_password(password: str) -> str:
    import bcrypt
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def _verify_password(password: str, password_hash: str) -> bool:
    import bcrypt
    return bcrypt.checkpw(password.encode(), password_hash.encode())
