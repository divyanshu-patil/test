from fastapi import APIRouter

from app.api.v1 import auth, posts, users

api_router = APIRouter(prefix="/api/v1")
for r in (auth.router, users.router, posts.router):
    api_router.include_router(r)
