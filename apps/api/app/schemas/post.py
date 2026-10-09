import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.schemas.auth import UserOut


class MediaOut(BaseModel):
    id: uuid.UUID
    url: str
    thumb_url: str
    width: int
    height: int
    alt_text: str | None


class PostOut(BaseModel):
    id: uuid.UUID
    author: UserOut
    caption: str | None
    media: list[MediaOut]
    like_count: int
    comment_count: int
    viewer_has_liked: bool
    created_at: datetime


class PostPage(BaseModel):
    items: list[PostOut]
    next_cursor: str | None


class LikeState(BaseModel):
    liked: bool
    like_count: int


class CommentIn(BaseModel):
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2200)]
    parent_id: uuid.UUID | None = None


class CommentOut(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    parent_id: uuid.UUID | None
    author: UserOut
    body: str
    created_at: datetime
    can_delete: bool


class CommentPage(BaseModel):
    items: list[CommentOut]
    next_cursor: str | None
