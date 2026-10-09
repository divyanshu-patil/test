from fastapi import APIRouter

from app.api.v1.deps import CurrentUser
from app.schemas.auth import MeOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=MeOut)
def me(user: CurrentUser):  # noqa: ANN201
    return user
