from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.speaker import Speaker

router = APIRouter()


@router.get("/catalog", response_model=dict)
async def public_catalog(db: AsyncSession = Depends(get_db)):
    """Return the public storefront catalog used by the frontend and WebMCP."""
    result = await db.execute(select(Speaker).order_by(Speaker.id))
    speakers = result.scalars().all()
    return {
        "products": [
            {
                "name": s.name,
                "type": s.type,
                "price": s.price,
                "image": s.image,
                "tone": s.tone,
                "category": s.category,
                "description": s.description,
                "specs": s.specs,
            }
            for s in speakers
        ]
    }
