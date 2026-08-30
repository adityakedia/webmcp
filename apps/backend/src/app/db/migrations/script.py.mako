from logging.config import fileConfig
from sqlalchemy import engine_from_config
from alembic import context

config = context.config
fileConfig(config.config_file_name)

from app.db.session import Base
from app.models.speaker import Speaker

target_metadata = Base.metadata

def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.")
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

run_migrations_online()
