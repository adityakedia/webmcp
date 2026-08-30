from fastapi import APIRouter
from app.api.endpoints import speakers, simulate

router = APIRouter()
router.include_router(speakers.router, prefix="/speakers", tags=["speakers"])
router.include_router(simulate.router, prefix="", tags=["simulation"])

__all__ = ["router"]
