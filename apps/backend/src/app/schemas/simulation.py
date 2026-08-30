from typing import Literal

from pydantic import BaseModel, Field, model_validator


class RoomDimensions(BaseModel):
    width: float = Field(ge=2, le=20)
    length: float = Field(ge=2, le=20)
    height: float = Field(ge=2, le=10)
    presetId: Literal["reflective", "living_room", "absorptive"] = "living_room"


class Position(BaseModel):
    x: float
    y: float
    z: float
    rotation: float = 0


class ListenerPosition(BaseModel):
    x: float
    y: float
    z: float


class SimulationRequest(BaseModel):
    speakerId: str = Field(min_length=1)
    room: RoomDimensions
    speakers: list[Position] = Field(min_length=2, max_length=2)
    listener: ListenerPosition

    @model_validator(mode="after")
    def positions_are_inside_room(self):
        positions = [*self.speakers, self.listener]
        for position in positions:
            if not (
                0 <= position.x <= self.room.width
                and 0 <= position.y <= self.room.length
                and 0 <= position.z <= self.room.height
            ):
                raise ValueError("All speakers and the listener must be inside the room")
        return self


class ImpulseResponses(BaseModel):
    left: str
    right: str


class SimulationMetrics(BaseModel):
    rt60: float


class SimulationResponse(BaseModel):
    simulationId: str
    impulseResponses: ImpulseResponses
    metrics: SimulationMetrics
