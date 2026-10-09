from sqlalchemy import create_engine

from alembic import context
from app.core.config import get_settings
from app.db.base import Base
from app.models import *  # noqa: F403

# MIGRATION_DATABASE_URL lets migrations use a session-mode pooler/direct connection.
url = get_settings().migration_database_url or get_settings().database_url
engine = create_engine(url, connect_args={"prepare_threshold": None})

with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()
