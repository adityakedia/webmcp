"""Database access for the public speaker catalog."""

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.speaker import Speaker


async def list_speakers(db: AsyncSession) -> list[Speaker]:
    result = await db.execute(select(Speaker).order_by(Speaker.id))
    return list(result.scalars().all())


async def find_speaker(db: AsyncSession, identifier: str) -> Speaker | None:
    result = await db.execute(select(Speaker).where(or_(Speaker.id == identifier, Speaker.name == identifier)))
    return result.scalar_one_or_none()
