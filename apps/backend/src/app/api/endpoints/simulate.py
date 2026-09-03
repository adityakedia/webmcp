from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.catalog_profiles import build_catalog_profile
from app.services.catalog_repository import find_speaker
from app.services.simulation import SimulationService
from app.schemas.simulation import SimulationRequest, SimulationResponse

router = APIRouter()

@router.post("/simulate", response_model=SimulationResponse)
async def simulate(
    config: SimulationRequest,
    db: AsyncSession = Depends(get_db),
):
    speaker = await find_speaker(db, config.speakerId)
    if not speaker and not config.speakerProfile:
        raise HTTPException(status_code=404, detail="Catalog speaker not found")
    service = SimulationService()
    profile = build_catalog_profile({"id": speaker.id, "name": speaker.name, "specs": speaker.specs}) if speaker else None
    return await service.run(config, profile)
