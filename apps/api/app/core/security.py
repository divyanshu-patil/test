import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings

SESSION_COOKIE = "socially_session"
CSRF_COOKIE = "socially_csrf"
CSRF_HEADER = "x-csrf-token"

_hasher = PasswordHasher()  # argon2id with library defaults
# Verified against when the user doesn't exist, so login timing doesn't reveal accounts.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def csrf_for(session_token: str) -> str:
    """CSRF token bound to the session: HMAC(secret, session token)."""
    key = get_settings().secret_key.encode()
    return hmac.new(key, session_token.encode(), hashlib.sha256).hexdigest()


def csrf_valid(session_token: str, header_value: str | None) -> bool:
    return bool(header_value) and hmac.compare_digest(csrf_for(session_token), header_value or "")
