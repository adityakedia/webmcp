from fastapi import APIRouter
from app.services.simulation import SimulationService
from app.schemas.simulation import SimulationRequest, SimulationResponse

router = APIRouter()

@router.post("/simulate", response_model=SimulationResponse)
async def simulate(
    config: SimulationRequest,
):
    service = SimulationService()
    return await service.run(config)
