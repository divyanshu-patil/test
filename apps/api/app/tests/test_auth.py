from app.core.security import hash_password, verify_password
from app.tests.conftest import register


def test_register_sets_session_and_hides_hash(client):
    body = register(client, "Alice_1")
    assert body["username"] == "alice_1"  # normalized
    assert "password" not in str(body)
    assert client.get("/api/v1/users/me").json()["username"] == "alice_1"


def test_password_is_argon2id():
    h = hash_password("secret123")
    assert h.startswith("$argon2id$")
    assert verify_password(h, "secret123") and not verify_password(h, "nope")
    assert not verify_password(None, "secret123")


def test_duplicate_username_and_email(client):
    register(client, "bob")
    client.cookies.clear()
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "username": "BOB", "password": "secret123"},
    )
    assert r.status_code == 409 and "username" in r.json()["detail"]
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "BOB@example.com", "username": "bobby", "password": "secret123"},
    )
    assert r.status_code == 409 and "email" in r.json()["detail"].lower()


def test_register_validation(client):
    for payload in (
        {"email": "x@example.com", "username": "ab", "password": "secret123"},
        {"email": "x@example.com", "username": "bad name", "password": "secret123"},
        {"email": "x@example.com", "username": "okname", "password": "short1"},
        {"email": "x@example.com", "username": "okname", "password": "lettersonly"},
        {"email": "not-an-email", "username": "okname", "password": "secret123"},
    ):
        assert client.post("/api/v1/auth/register", json=payload).status_code == 422


def test_login_logout(client):
    register(client, "carol")
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/users/me").status_code == 401

    bad = client.post("/api/v1/auth/login", json={"identifier": "carol", "password": "wrong1234"})
    assert bad.status_code == 401
    ok = client.post(
        "/api/v1/auth/login", json={"identifier": "CAROL@example.com", "password": "secret123"}
    )
    assert ok.status_code == 200
    old_token = client.cookies["socially_session"]
    client.headers["x-csrf-token"] = client.cookies["socially_csrf"]
    assert client.post("/api/v1/auth/logout").status_code == 204
    # Server-side revocation: the old token no longer works even if replayed.
    client.cookies.set("socially_session", old_token)
    assert client.get("/api/v1/users/me").status_code == 401


def test_unknown_user_gets_same_error(client):
    r = client.post("/api/v1/auth/login", json={"identifier": "ghost", "password": "secret123"})
    assert r.status_code == 401 and r.json()["detail"] == "Incorrect username or password."


def test_csrf_required_for_authenticated_writes(client):
    register(client, "dave")
    del client.headers["x-csrf-token"]
    assert client.post("/api/v1/auth/logout").status_code == 403
    client.headers["x-csrf-token"] = "forged"
    assert client.post("/api/v1/auth/logout").status_code == 403


def test_foreign_origin_rejected(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"identifier": "x", "password": "y"},
        headers={"origin": "https://evil.example"},
    )
    assert r.status_code == 403


def test_login_rate_limited(client):
    codes = [
        client.post("/api/v1/auth/login", json={"identifier": "eve", "password": "x"}).status_code
        for _ in range(11)
    ]
    assert codes[:10] == [401] * 10 and codes[10] == 429


def test_health(client):
    assert client.get("/health/live").json() == {"status": "ok"}
    assert client.get("/health/ready").status_code == 200
