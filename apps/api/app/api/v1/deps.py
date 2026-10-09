from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import SESSION_COOKIE
from app.db.session import get_db
from app.models import User
from app.services import auth

DB = Annotated[Session, Depends(get_db)]


def current_user(request: Request, db: DB) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    user = auth.user_for_token(db, token) if token else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in.")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"
