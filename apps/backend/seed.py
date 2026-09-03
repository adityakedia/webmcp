import asyncio
from app.db.session import engine, Base
import app.models  # noqa: F401 - register every table before create_all

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("Database tables created successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
