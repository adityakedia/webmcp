from pydantic import BaseModel
from typing import Optional

class SpeakerCreate(BaseModel):
    manufacturer: str
    model: str
    type: str
    sensitivity: Optional[float] = None
    frequency_response: Optional[list[float]] = None
    directivity: Optional[dict] = None
    image_url: Optional[str] = None

class SpeakerResponse(SpeakerCreate):
    id: str

    class Config:
        from_attributes = True
