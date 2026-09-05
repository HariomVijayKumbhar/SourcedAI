import datetime
from typing import Optional, Dict, Any
import jwt
import bcrypt
from config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_user(username: str, password: str) -> Dict[str, Any]:
    from services.database import get_user_by_username, create_user as db_create_user

    existing = get_user_by_username(username)
    if existing:
        raise ValueError("Username already exists")
    return db_create_user(username, hash_password(password))


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    from services.database import get_user_by_username

    user = get_user_by_username(username)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return {"id": user["id"], "username": user["username"]}


def create_token(user_id: str, username: str, ttl_seconds: Optional[int] = None) -> str:
    settings = get_settings()
    now = datetime.datetime.now(datetime.timezone.utc)
    if ttl_seconds is None:
        ttl_seconds = settings.jwt_expire_seconds
    payload = {
        "sub": user_id,
        "username": username,
        "iat": now,
        "exp": now + datetime.timedelta(seconds=ttl_seconds),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None
