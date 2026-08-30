from fastapi import APIRouter

from app.api.endpoints import simulate, speakers

router = APIRouter(prefix="/api")
router.include_router(speakers.router, prefix="/speakers", tags=["speakers"])
router.include_router(simulate.router, tags=["simulation"])
