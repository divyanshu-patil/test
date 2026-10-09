import re
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field

USERNAME_RE = re.compile(r"^[a-z0-9._]{3,30}$")


def _normalize_username(v: str) -> str:
    v = v.strip().lower()
    if not USERNAME_RE.fullmatch(v):
        raise ValueError("3-30 characters: letters, numbers, periods and underscores only")
    if v.startswith(".") or v.endswith(".") or ".." in v:
        raise ValueError("Periods can't be at the start, end, or repeated")
    return v


def _check_password(v: str) -> str:
    if not (re.search(r"[A-Za-z]", v) and re.search(r"\d", v)):
        raise ValueError("Password must contain at least one letter and one number")
    return v


Username = Annotated[str, AfterValidator(_normalize_username)]


class RegisterIn(BaseModel):
    email: EmailStr
    username: Username
    password: Annotated[str, Field(min_length=8, max_length=128), AfterValidator(_check_password)]
    display_name: Annotated[str | None, Field(max_length=60)] = None


class LoginIn(BaseModel):
    # Accepts username or email.
    identifier: Annotated[str, Field(min_length=1, max_length=254)]
    password: Annotated[str, Field(min_length=1, max_length=128)]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str | None
    bio: str | None
    created_at: datetime


class MeOut(UserOut):
    email: str
