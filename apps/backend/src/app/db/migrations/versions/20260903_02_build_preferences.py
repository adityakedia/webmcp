"""Store listening brief metadata separately from the speaker specification."""
import sqlalchemy as sa
from alembic import op
revision = "20260903_02"
down_revision = "20260831_01"
branch_labels = None
depends_on = None
def upgrade() -> None:
    op.add_column("custom_speaker_configurations", sa.Column("preferences", sa.JSON(), nullable=True))
def downgrade() -> None:
    op.drop_column("custom_speaker_configurations", "preferences")
