import base64
import binascii
import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models import Comment, Like, Post, PostMedia, User
from app.schemas.auth import UserOut
from app.schemas.post import MediaOut, PostOut
from app.services import media


def visible_posts():  # noqa: ANN201
    return (
        select(Post)
        .join(User, User.id == Post.author_id)
        .where(Post.deleted_at.is_(None), User.status == "active")
    )


def create_post(
    db: Session,
    author: User,
    caption: str | None,
    images: list[tuple[bytes, str | None]],
) -> Post:
    post = Post(id=uuid.uuid4(), author_id=author.id, caption=caption)
    saved: list[str] = []
    try:
        for i, (data, alt) in enumerate(images):
            stored = media.save_post_image(post.id, data)
            saved += [stored.object_key, stored.thumb_key]
            post.media.append(
                PostMedia(
                    object_key=stored.object_key,
                    thumb_key=stored.thumb_key,
                    width=stored.width,
                    height=stored.height,
                    alt_text=alt,
                    position=i,
                )
            )
        db.add(post)
        db.commit()
    except BaseException:
        db.rollback()
        media.delete_objects(saved)  # don't leave orphaned files behind
        raise
    db.refresh(post)
    return post


def get_post(db: Session, post_id: uuid.UUID) -> Post | None:
    return db.scalar(visible_posts().where(Post.id == post_id))


def delete_post(db: Session, post: Post) -> None:
    post.deleted_at = datetime.now(UTC)
    db.commit()
    media.delete_objects([k for m in post.media for k in (m.object_key, m.thumb_key)])


def encode_cursor(row: Post | Comment) -> str:
    raw = f"{row.created_at.isoformat()}|{row.id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        ts, pid = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
        return datetime.fromisoformat(ts), uuid.UUID(pid)
    except (ValueError, binascii.Error, UnicodeDecodeError) as e:
        raise ValueError("Invalid cursor") from e


def feed_page(db: Session, cursor: str | None, limit: int) -> tuple[list[Post], str | None]:
    # MVP feed: all visible posts, newest first. Follow filtering arrives with the follow graph.
    q = visible_posts().order_by(Post.created_at.desc(), Post.id.desc()).limit(limit + 1)
    if cursor:
        ts, pid = decode_cursor(cursor)
        q = q.where(or_(Post.created_at < ts, and_(Post.created_at == ts, Post.id < pid)))
    rows = list(db.scalars(q).unique())
    more = len(rows) > limit
    rows = rows[:limit]
    return rows, (encode_cursor(rows[-1]) if more and rows else None)


def _counts(db: Session, stmt) -> dict[uuid.UUID, int]:  # noqa: ANN001
    return {pid: n for pid, n in db.execute(stmt)}


def serialize(db: Session, rows: list[Post], viewer: User) -> list[PostOut]:
    """Posts with engagement data: 3 grouped queries per page, regardless of page size."""
    ids = [p.id for p in rows]
    if not ids:
        return []
    likes = _counts(
        db,
        select(Like.post_id, func.count()).where(Like.post_id.in_(ids)).group_by(Like.post_id),
    )
    comments = _counts(
        db,
        select(Comment.post_id, func.count())
        .where(Comment.post_id.in_(ids), Comment.deleted_at.is_(None))
        .group_by(Comment.post_id),
    )
    liked = set(
        db.scalars(select(Like.post_id).where(Like.post_id.in_(ids), Like.user_id == viewer.id))
    )
    return [
        PostOut(
            id=p.id,
            author=UserOut.model_validate(p.author),
            caption=p.caption,
            created_at=p.created_at,
            like_count=likes.get(p.id, 0),
            comment_count=comments.get(p.id, 0),
            viewer_has_liked=p.id in liked,
            media=[
                MediaOut(
                    id=m.id,
                    url=f"/api/v1/media/{m.id}",
                    thumb_url=f"/api/v1/media/{m.id}?size=thumb",
                    width=m.width,
                    height=m.height,
                    alt_text=m.alt_text,
                )
                for m in p.media
            ],
        )
        for p in rows
    ]
