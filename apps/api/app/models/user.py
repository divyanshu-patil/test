import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, utcnow


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("username ~ '^[a-z0-9._]{3,30}$'", name="username_format"),
        CheckConstraint("status IN ('active', 'suspended')", name="status_valid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(30), unique=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(60))
    bio: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # sha256 of the cookie token; the raw token is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    user_agent: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime]
