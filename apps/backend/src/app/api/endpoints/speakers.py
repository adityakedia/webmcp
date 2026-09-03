from fastapi import APIRouter
from app.services.public_catalog import PUBLIC_CATALOG

router = APIRouter()


@router.get("/catalog", response_model=dict)
async def public_catalog():
    """Return the public storefront catalog used by the frontend and WebMCP."""
    return {"products": PUBLIC_CATALOG}
