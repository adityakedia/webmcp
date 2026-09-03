from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.catalog_repository import list_speakers

router = APIRouter()


@router.get("/catalog", response_model=dict)
async def public_catalog(db: AsyncSession = Depends(get_db)):
    """Return the public storefront catalog used by the frontend and WebMCP."""
    speakers = await list_speakers(db)
    return {
        "products": [
            {
                "id": s.id,
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
