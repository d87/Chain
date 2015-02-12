"""create tables

Revision ID: 1f6d9f99aeb6
Revises: 
Create Date: 2015-02-08 08:53:33.474978

"""

# revision identifiers, used by Alembic.
revision = '1f6d9f99aeb6'
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'tasks',
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.Unicode(120)),
        sa.Column("task_start_time", sa.Time),
        sa.Column("task_length", sa.Integer),
        sa.Column("task_time", sa.Integer,default=0),
        sa.Column("task_state", sa.Unicode(12), default=u"INACTIVE"),
        sa.Column("pomo_time", sa.Integer,default=0),
        sa.Column("pomo_length", sa.Integer, default=25*60),
        sa.Column("pomo_break_length", sa.Integer, default=5*60),
        sa.Column("pomo_completed", sa.Integer, default=0),
        sa.Column("pomo_state", sa.Unicode(12), default=u"INACTIVE")
    )
    op.create_table(
        'listtasks',
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.Unicode(100)),
        sa.Column("description", sa.UnicodeText, default=u""),
        sa.Column("priority", sa.Integer, default=50),
        sa.Column("state", sa.Unicode(10), default=u"ACTIVE"),

        sa.Column("created_date", sa.DateTime ),
        sa.Column("is_time_limited", sa.Boolean, default=False),
        sa.Column("expiration_date", sa.DateTime),

        sa.Column("use_markup", sa.Boolean, default = False)
    )


def downgrade():
    op.drop_table('tasks')
    op.drop_table('listtasks')
