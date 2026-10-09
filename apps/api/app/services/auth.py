from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.models import User, UserSession
from app.schemas.auth import LoginIn, RegisterIn


class AuthError(Exception):
    def __init__(self, status: int, detail: str) -> None:
        self.status, self.detail = status, detail


def register(db: Session, data: RegisterIn) -> User:
    user = User(
        email=str(data.email).lower(),
        username=data.username,
        password_hash=security.hash_password(data.password),
        display_name=(data.display_name or "").strip() or None,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        taken = "username" if "username" in str(e.orig) else "email"
        # Username clashes are public anyway; email clashes get a generic message.
        msg = (
            "That username is taken."
            if taken == "username"
            else "Unable to register with that email."
        )
        raise AuthError(409, msg) from e
    return user


def authenticate(db: Session, data: LoginIn) -> User:
    ident = data.identifier.strip().lower()
    user = db.scalar(select(User).where(or_(User.username == ident, User.email == ident)))
    ok = security.verify_password(user.password_hash if user else None, data.password)
    if not user or not ok:
        raise AuthError(401, "Incorrect username or password.")
    if user.status != "active":
        raise AuthError(403, "This account is suspended.")
    return user


def create_session(db: Session, user: User, user_agent: str | None) -> str:
    token = security.new_session_token()
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=security.hash_token(token),
            user_agent=(user_agent or "")[:255] or None,
            expires_at=datetime.now(UTC) + timedelta(days=get_settings().session_ttl_days),
        )
    )
    db.commit()
    return token


def user_for_token(db: Session, token: str) -> User | None:
    row = db.execute(
        select(User)
        .join(UserSession, UserSession.user_id == User.id)
        .where(
            UserSession.token_hash == security.hash_token(token),
            UserSession.expires_at > datetime.now(UTC),
            User.status == "active",
        )
    ).scalar_one_or_none()
    return row


def revoke_session(db: Session, token: str) -> None:
    db.execute(delete(UserSession).where(UserSession.token_hash == security.hash_token(token)))
    db.commit()
