from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.speaker import Speaker
from app.schemas.speaker import SpeakerResponse

router = APIRouter()

@router.get("/", response_model=dict)
async def list_speakers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Speaker))
    speakers = result.scalars().all()
    return {"speakers": [SpeakerResponse.model_validate(s) for s in speakers]}

@router.get("/{speaker_id}", response_model=SpeakerResponse)
async def get_speaker(speaker_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Speaker).where(Speaker.id == speaker_id))
    speaker = result.scalar_one_or_none()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return SpeakerResponse.model_validate(speaker)
