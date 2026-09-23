from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth_utils import COOKIE_NAME, decode_access_token


def get_current_user(
    db: Session = Depends(get_db),
    geo_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> User:
    if not geo_session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_access_token(geo_session)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user