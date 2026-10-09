from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str
    migration_database_url: str | None = None
    secret_key: str = Field(min_length=32)
    frontend_origins: list[str] = ["http://localhost:3000"]
    cookie_secure: bool = False
    session_ttl_days: int = 30
    media_root: Path = Path("media")
    max_upload_bytes: int = 10 * 1024 * 1024
    max_images_per_post: int = 10
    register_limit_per_hour: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
