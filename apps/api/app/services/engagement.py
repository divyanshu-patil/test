import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import Comment, Like, Post, User
from app.schemas.auth import UserOut
from app.schemas.post import CommentOut
from app.services.posts import decode_cursor, encode_cursor


def set_like(db: Session, user: User, post: Post, liked: bool) -> int:
    """Idempotent like/unlike; safe under concurrent duplicate requests."""
    if liked:
        db.execute(insert(Like).values(user_id=user.id, post_id=post.id).on_conflict_do_nothing())
    else:
        db.execute(delete(Like).where(Like.user_id == user.id, Like.post_id == post.id))
    db.commit()
    return db.scalar(select(func.count()).where(Like.post_id == post.id)) or 0


def visible_comments():  # noqa: ANN201
    return (
        select(Comment)
        .join(User, User.id == Comment.author_id)
        .where(Comment.deleted_at.is_(None), User.status == "active")
    )


def add_comment(
    db: Session, user: User, post: Post, body: str, parent_id: uuid.UUID | None
) -> Comment:
    if parent_id is not None:
        parent = db.scalar(
            visible_comments().where(Comment.id == parent_id, Comment.post_id == post.id)
        )
        if not parent:
            raise ValueError("The comment you're replying to no longer exists.")
    comment = Comment(post_id=post.id, author_id=user.id, body=body, parent_id=parent_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def comment_page(
    db: Session, post: Post, cursor: str | None, limit: int
) -> tuple[list[Comment], str | None]:
    # Oldest first, so conversations read top to bottom.
    q = (
        visible_comments()
        .where(Comment.post_id == post.id)
        .order_by(Comment.created_at, Comment.id)
        .limit(limit + 1)
    )
    if cursor:
        ts, cid = decode_cursor(cursor)
        q = q.where(or_(Comment.created_at > ts, and_(Comment.created_at == ts, Comment.id > cid)))
    rows = list(db.scalars(q).unique())
    more = len(rows) > limit
    rows = rows[:limit]
    return rows, (encode_cursor(rows[-1]) if more and rows else None)


def can_delete(comment: Comment, post: Post, user: User) -> bool:
    # Comment authors and the post owner may remove a comment.
    return user.id in (comment.author_id, post.author_id)


def delete_comment(db: Session, comment: Comment) -> None:
    comment.deleted_at = datetime.now(UTC)
    db.commit()


def to_out(comment: Comment, post: Post, viewer: User) -> CommentOut:
    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        author=UserOut.model_validate(comment.author),
        body=comment.body,
        created_at=comment.created_at,
        can_delete=can_delete(comment, post, viewer),
    )
