import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from dotenv import load_dotenv
load_dotenv()


password_hash = PasswordHash.recommended()


JWT_SECRET = os.getenv("AUTH_JWT_SECRET", "dev_only_change_me")
ENV = os.getenv("ENV", "development")

if ENV == "production" and JWT_SECRET in ("", "dev_only_change_me"):
    raise RuntimeError("En producción debes definir AUTH_JWT_SECRET fuerte en el .env")

JWT_ALG = "HS256"
JWT_EXPIRE_DAYS = 30
COOKIE_NAME = "geo_session"

def hash_password(plain: str) -> str:
    return password_hash.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return password_hash.verify(plain, hashed)

def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None