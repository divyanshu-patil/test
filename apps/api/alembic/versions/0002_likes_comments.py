"""likes and comments

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

TS = sa.DateTime(timezone=True)


def upgrade() -> None:
    op.create_table(
        "likes",
        sa.Column(
            "user_id", sa.Uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column(
            "post_id", sa.Uuid, sa.ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("created_at", TS, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_likes_post_id", "likes", ["post_id"])
    op.create_table(
        "comments",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column(
            "post_id", sa.Uuid, sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "author_id", sa.Uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("parent_id", sa.Uuid, sa.ForeignKey("comments.id", ondelete="CASCADE")),
        sa.Column("body", sa.String(2200), nullable=False),
        sa.Column("created_at", TS, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", TS, nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", TS),
        sa.CheckConstraint("length(btrim(body)) > 0", name="body_not_blank"),
    )
    op.create_index("ix_comments_post_created", "comments", ["post_id", "created_at", "id"])
    # Keep Supabase's Data API locked out (see 0001).
    for t in ("likes", "comments"):
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table("comments")
    op.drop_table("likes")
