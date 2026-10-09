import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core import security
from app.core.config import get_settings
from app.db.session import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("socially")
settings = get_settings()

app = FastAPI(title="Socially API", version="0.1.0")
UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


@app.middleware("http")
async def guard(request: Request, call_next):  # noqa: ANN001, ANN201
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    if request.method in UNSAFE:
        origin = request.headers.get("origin")
        if origin and origin not in settings.frontend_origins:
            return JSONResponse({"detail": "Origin not allowed."}, status_code=403)
        token = request.cookies.get(security.SESSION_COOKIE)
        is_auth_entry = request.url.path in ("/api/v1/auth/login", "/api/v1/auth/register")
        if (
            token
            and not is_auth_entry
            and not security.csrf_valid(token, request.headers.get(security.CSRF_HEADER))
        ):
            return JSONResponse({"detail": "Invalid CSRF token."}, status_code=403)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    log.info("%s %s %s rid=%s", request.method, request.url.path, response.status_code, request_id)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["content-type", security.CSRF_HEADER],
)


@app.get("/health/live", tags=["health"])
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
def ready() -> JSONResponse:
    try:
        with engine.connect() as conn:
            conn.execute(text("select 1"))
    except Exception:
        log.exception("readiness check failed")
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return JSONResponse({"status": "ok"})


app.include_router(api_router)
