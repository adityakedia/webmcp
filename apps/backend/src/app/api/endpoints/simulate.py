from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.speaker import Speaker
from app.services.catalog_profiles import build_catalog_profile
from app.services.simulation import SimulationService
from app.schemas.simulation import SimulationRequest, SimulationResponse

router = APIRouter()

@router.post("/simulate", response_model=SimulationResponse)
async def simulate(
    config: SimulationRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Speaker).where(or_(Speaker.id == config.speakerId, Speaker.name == config.speakerId)))
    speaker = result.scalar_one_or_none()
    if not speaker and not config.speakerProfile:
        raise HTTPException(status_code=404, detail="Catalog speaker not found")
    service = SimulationService()
    profile = build_catalog_profile({"id": speaker.id, "name": speaker.name, "specs": speaker.specs}) if speaker else None
    return await service.run(config, profile)
