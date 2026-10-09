import io
import os
import tempfile

# Tests never touch the dev/prod database: always a dedicated, disposable one.
TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://localhost/socially_test")
os.environ.update(
    DATABASE_URL=TEST_DB,
    MIGRATION_DATABASE_URL=TEST_DB,
    SECRET_KEY="test-secret-key-that-is-long-enough-for-hmac-0123",
    MEDIA_ROOT=tempfile.mkdtemp(prefix="socially-media-"),
    FRONTEND_ORIGINS='["http://localhost:3000"]',
)

import pytest  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from alembic import command  # noqa: E402


def _ensure_database() -> None:
    url = make_url(TEST_DB)
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as c:
        if not c.scalar(text("select 1 from pg_database where datname=:n"), {"n": url.database}):
            c.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin.dispose()


@pytest.fixture(scope="session", autouse=True)
def _migrated():
    _ensure_database()
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "..", "alembic.ini"))
    cfg.set_main_option(
        "script_location", os.path.join(os.path.dirname(__file__), "..", "..", "alembic")
    )
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")  # exercises the real migrations


@pytest.fixture(autouse=True)
def _clean():
    from app.core.ratelimit import limiter
    from app.db.session import engine

    yield
    limiter.reset()
    with engine.begin() as c:
        c.execute(text("TRUNCATE users, user_sessions, posts, post_media, likes, comments CASCADE"))


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app, base_url="http://testserver") as c:
        yield c


def register(client: TestClient, username: str = "alice", password: str = "secret123") -> dict:
    r = client.post(
        "/api/v1/auth/register",
        json={"email": f"{username}@example.com", "username": username, "password": password},
    )
    assert r.status_code == 201, r.text
    client.headers["x-csrf-token"] = client.cookies["socially_csrf"]
    return r.json()


def image_bytes(fmt: str = "PNG", size: tuple[int, int] = (800, 600)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 100, 50)).save(buf, fmt)
    return buf.getvalue()
