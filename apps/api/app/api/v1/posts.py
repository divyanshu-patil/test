import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.api.v1.deps import DB, CurrentUser
from app.core.config import get_settings
from app.core.ratelimit import limiter
from app.models import Comment, Post, PostMedia
from app.schemas.post import CommentIn, CommentOut, CommentPage, LikeState, PostOut, PostPage
from app.services import engagement, media, posts

router = APIRouter(tags=["posts"])


@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(  # noqa: ANN201
    user: CurrentUser,
    db: DB,
    files: Annotated[list[UploadFile], File(description="1-10 images")],
    caption: Annotated[str | None, Form(max_length=2200)] = None,
    alt_texts: Annotated[list[str] | None, Form()] = None,
):
    s = get_settings()
    limiter.hit(f"upload:{user.id}", limit=30, window_s=3600)
    if not 1 <= len(files) <= s.max_images_per_post:
        raise HTTPException(422, f"Attach between 1 and {s.max_images_per_post} images.")
    alts = alt_texts or []
    images: list[tuple[bytes, str | None]] = []
    for i, f in enumerate(files):
        data = f.file.read(s.max_upload_bytes + 1)
        if len(data) > s.max_upload_bytes:
            raise HTTPException(413, f"Each image must be under {s.max_upload_bytes // 2**20} MB.")
        alt = (alts[i].strip()[:500] or None) if i < len(alts) else None
        images.append((data, alt))
    try:
        post = posts.create_post(db, user, (caption or "").strip() or None, images)
    except media.InvalidImage as e:
        raise HTTPException(422, str(e)) from e
    return posts.serialize(db, [post], user)[0]


def _post_or_404(db: DB, post_id: uuid.UUID) -> Post:
    post = posts.get_post(db, post_id)
    if not post:
        raise HTTPException(404, "Post not found.")
    return post


@router.get("/posts/{post_id}", response_model=PostOut)
def get_post(post_id: uuid.UUID, user: CurrentUser, db: DB):  # noqa: ANN201
    return posts.serialize(db, [_post_or_404(db, post_id)], user)[0]


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: uuid.UUID, user: CurrentUser, db: DB) -> None:
    post = _post_or_404(db, post_id)
    if post.author_id != user.id:
        raise HTTPException(403, "You can only delete your own posts.")
    posts.delete_post(db, post)


@router.get("/feed", response_model=PostPage)
def feed(  # noqa: ANN201
    user: CurrentUser,
    db: DB,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
):
    try:
        rows, next_cursor = posts.feed_page(db, cursor, limit)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    return PostPage(items=posts.serialize(db, rows, user), next_cursor=next_cursor)


@router.put("/posts/{post_id}/like", response_model=LikeState)
def like(post_id: uuid.UUID, user: CurrentUser, db: DB) -> LikeState:
    limiter.hit(f"like:{user.id}", limit=120, window_s=60)
    count = engagement.set_like(db, user, _post_or_404(db, post_id), liked=True)
    return LikeState(liked=True, like_count=count)


@router.delete("/posts/{post_id}/like", response_model=LikeState)
def unlike(post_id: uuid.UUID, user: CurrentUser, db: DB) -> LikeState:
    limiter.hit(f"like:{user.id}", limit=120, window_s=60)
    count = engagement.set_like(db, user, _post_or_404(db, post_id), liked=False)
    return LikeState(liked=False, like_count=count)


@router.get("/posts/{post_id}/comments", response_model=CommentPage)
def list_comments(  # noqa: ANN201
    post_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    post = _post_or_404(db, post_id)
    try:
        rows, next_cursor = engagement.comment_page(db, post, cursor, limit)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    return CommentPage(
        items=[engagement.to_out(c, post, user) for c in rows], next_cursor=next_cursor
    )


@router.post(
    "/posts/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED
)
def create_comment(post_id: uuid.UUID, data: CommentIn, user: CurrentUser, db: DB) -> CommentOut:
    limiter.hit(f"comment:{user.id}", limit=30, window_s=600)
    post = _post_or_404(db, post_id)
    try:
        comment = engagement.add_comment(db, user, post, data.body, data.parent_id)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    return engagement.to_out(comment, post, user)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: uuid.UUID, user: CurrentUser, db: DB) -> None:
    comment = db.scalar(engagement.visible_comments().where(Comment.id == comment_id))
    post = posts.get_post(db, comment.post_id) if comment else None
    if not comment or not post:
        raise HTTPException(404, "Comment not found.")
    if not engagement.can_delete(comment, post, user):
        raise HTTPException(403, "You can't delete this comment.")
    engagement.delete_comment(db, comment)


@router.get("/media/{media_id}", response_class=FileResponse)
def get_media(
    media_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    size: Literal["full", "thumb"] = "full",
) -> FileResponse:
    item = db.get(PostMedia, media_id)
    if not item or not posts.get_post(db, item.post_id):
        raise HTTPException(404, "Media not found.")
    path = media.object_path(item.thumb_key if size == "thumb" else item.object_key)
    if not path.is_file():
        raise HTTPException(404, "Media not found.")
    return FileResponse(
        path, media_type="image/webp", headers={"Cache-Control": "private, max-age=86400"}
    )
