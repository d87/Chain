"""table for days

Revision ID: 1ab8869182e1
Revises: 1f6d9f99aeb6
Create Date: 2015-02-11 20:10:42.439800

"""

# revision identifiers, used by Alembic.
revision = '1ab8869182e1'
down_revision = '1f6d9f99aeb6'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'days',
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("date", sa.Date),
        sa.Column("state", sa.Unicode(15), default=u"MISSED"),
        sa.Column("report", sa.UnicodeText, default=u"")
    )


def downgrade():
    op.drop_table('days')
