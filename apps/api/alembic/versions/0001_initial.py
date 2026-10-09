"""users, sessions, posts, post media

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

TS = sa.DateTime(timezone=True)
TABLES = ("users", "user_sessions", "posts", "post_media")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("username", sa.String(30), nullable=False, unique=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(60)),
        sa.Column("bio", sa.String(300)),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("created_at", TS, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", TS, nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("username ~ '^[a-z0-9._]{3,30}$'", name="username_format"),
        sa.CheckConstraint("status IN ('active', 'suspended')", name="status_valid"),
    )
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column(
            "user_id", sa.Uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("user_agent", sa.String(255)),
        sa.Column("created_at", TS, nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", TS, nullable=False),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
    op.create_table(
        "posts",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column(
            "author_id", sa.Uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("caption", sa.Text),
        sa.Column("created_at", TS, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", TS, nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", TS),
    )
    op.create_index("ix_posts_feed", "posts", ["created_at", "id"])
    op.create_index("ix_posts_author_created", "posts", ["author_id", "created_at", "id"])
    op.create_table(
        "post_media",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column(
            "post_id", sa.Uuid, sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("object_key", sa.String(255), nullable=False),
        sa.Column("thumb_key", sa.String(255), nullable=False),
        sa.Column("media_type", sa.String(32), nullable=False),
        sa.Column("width", sa.Integer, nullable=False),
        sa.Column("height", sa.Integer, nullable=False),
        sa.Column("alt_text", sa.String(500)),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("created_at", TS, nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("width > 0 AND height > 0", name="dimensions_positive"),
        sa.CheckConstraint("position >= 0", name="position_nonnegative"),
    )
    op.create_index("ix_post_media_post_id", "post_media", ["post_id"])
    # Supabase exposes `public` via its Data API. RLS with no policies blocks anon/authenticated
    # roles entirely; the API connects as the table owner, which bypasses RLS.
    for t in TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for t in reversed(TABLES):
        op.drop_table(t)
