from fastapi import APIRouter

from app.api.endpoints import auth, configurations, custom_speakers, simulate, speakers

router = APIRouter(prefix="/api")
router.include_router(speakers.router, prefix="/speakers", tags=["speakers"])
router.include_router(simulate.router, tags=["simulation"])
router.include_router(custom_speakers.router, prefix="/custom-speakers", tags=["custom-speakers"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(configurations.router, prefix="/configurations", tags=["configurations"])
