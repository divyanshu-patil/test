import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow
from app.models.user import User


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (
        Index("ix_posts_feed", "created_at", "id"),
        Index("ix_posts_author_created", "author_id", "created_at", "id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    caption: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    deleted_at: Mapped[datetime | None]

    author: Mapped[User] = relationship(lazy="joined")
    media: Mapped[list["PostMedia"]] = relationship(
        order_by="PostMedia.position", cascade="all, delete-orphan", lazy="selectin"
    )


class PostMedia(Base):
    __tablename__ = "post_media"
    __table_args__ = (
        CheckConstraint("width > 0 AND height > 0", name="dimensions_positive"),
        CheckConstraint("position >= 0", name="position_nonnegative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), index=True
    )
    object_key: Mapped[str] = mapped_column(String(255))
    thumb_key: Mapped[str] = mapped_column(String(255))
    media_type: Mapped[str] = mapped_column(String(32), default="image/webp")
    width: Mapped[int]
    height: Mapped[int]
    alt_text: Mapped[str | None] = mapped_column(String(500))
    position: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
