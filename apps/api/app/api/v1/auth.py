from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.v1.deps import DB, client_ip
from app.core import security
from app.core.config import get_settings
from app.core.ratelimit import limiter
from app.models import User
from app.schemas.auth import LoginIn, MeOut, RegisterIn
from app.services import auth

router = APIRouter(prefix="/auth", tags=["auth"])


def _start_session(response: Response, db: DB, request: Request, user: User) -> None:
    token = auth.create_session(db, user, request.headers.get("user-agent"))
    s = get_settings()
    # The CSRF cookie is readable by JS so the client can echo it in X-CSRF-Token.
    for name, value, httponly in (
        (security.SESSION_COOKIE, token, True),
        (security.CSRF_COOKIE, security.csrf_for(token), False),
    ):
        response.set_cookie(
            name,
            value,
            max_age=s.session_ttl_days * 86400,
            httponly=httponly,
            secure=s.cookie_secure,
            samesite="lax",
            path="/",
        )


def _raise(e: auth.AuthError) -> None:
    raise HTTPException(e.status, e.detail)


@router.post("/register", response_model=MeOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, request: Request, response: Response, db: DB):  # noqa: ANN201
    limit = get_settings().register_limit_per_hour
    limiter.hit(f"register:{client_ip(request)}", limit=limit, window_s=3600)
    try:
        user = auth.register(db, data)
    except auth.AuthError as e:
        _raise(e)
    _start_session(response, db, request, user)
    return user


@router.post("/login", response_model=MeOut)
def login(data: LoginIn, request: Request, response: Response, db: DB):  # noqa: ANN201
    limiter.hit(f"login:ip:{client_ip(request)}", limit=20, window_s=300)
    limiter.hit(f"login:id:{data.identifier.strip().lower()}", limit=10, window_s=300)
    try:
        user = auth.authenticate(db, data)
    except auth.AuthError as e:
        _raise(e)
    # Any pre-existing session cookie is replaced by a fresh token (no fixation).
    if old := request.cookies.get(security.SESSION_COOKIE):
        auth.revoke_session(db, old)
    _start_session(response, db, request, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: DB) -> None:
    if token := request.cookies.get(security.SESSION_COOKIE):
        auth.revoke_session(db, token)
    response.delete_cookie(security.SESSION_COOKIE, path="/")
    response.delete_cookie(security.CSRF_COOKIE, path="/")
