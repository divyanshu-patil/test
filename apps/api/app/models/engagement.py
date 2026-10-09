import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow
from app.models.user import User


class Like(Base):
    __tablename__ = "likes"

    # Composite PK = one like per user per post, enforced by the database.
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        Index("ix_comments_post_created", "post_id", "created_at", "id"),
        CheckConstraint("length(btrim(body)) > 0", name="body_not_blank"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE")
    )
    body: Mapped[str] = mapped_column(String(2200))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    deleted_at: Mapped[datetime | None]

    author: Mapped[User] = relationship(lazy="joined")
