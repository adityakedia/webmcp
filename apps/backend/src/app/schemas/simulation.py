from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.services.custom_speaker_catalog import REFERENCE_SYSTEMS


class RoomDimensions(BaseModel):
    width: float = Field(ge=2, le=20)
    length: float = Field(ge=2, le=20)
    height: float = Field(ge=2, le=10)
    presetId: Literal["reflective", "living_room", "absorptive"] = "living_room"
    surfaceAbsorption: "SurfaceAbsorption | None" = None


class SurfaceAbsorption(BaseModel):
    """Optional per-surface absorption coefficients; omitted keeps the preset."""

    floor: float | None = Field(default=None, ge=0, le=1)
    ceiling: float | None = Field(default=None, ge=0, le=1)
    north: float | None = Field(default=None, ge=0, le=1)
    south: float | None = Field(default=None, ge=0, le=1)
    east: float | None = Field(default=None, ge=0, le=1)
    west: float | None = Field(default=None, ge=0, le=1)


class Position(BaseModel):
    x: float
    y: float
    z: float
    rotation: float = 0
    directivity: Literal["omni", "cardioid"] = "omni"


class ListenerPosition(BaseModel):
    x: float
    y: float
    z: float


class SealedBoxModelInputs(BaseModel):
    alignment: Literal["sealed"]
    netVolumeLitres: float = Field(gt=0, le=250)


class PortedBoxModelInputs(BaseModel):
    alignment: Literal["ported"]
    netVolumeLitres: float = Field(gt=0, le=250)
    tuningHz: float = Field(ge=24, le=65)


class AcousticModifiers(BaseModel):
    baffleStepDb: float = Field(default=0, ge=-6, le=6)
    grilleHighFrequencyTrimDb: float = Field(default=0, ge=-6, le=0)
    dampingLowFrequencyTrimDb: float = Field(default=0, ge=-3, le=3)


class SimulationSpeakerProfile(BaseModel):
    status: Literal["reference_ready", "component_model_ready"]
    referenceId: Literal[
        "two_way_compact", "two_way_extended", "three_way_reference", "subwoofer_active"
    ]
    modelInputs: SealedBoxModelInputs | PortedBoxModelInputs | None = None
    acousticModifiers: AcousticModifiers = Field(default_factory=AcousticModifiers)

    @model_validator(mode="after")
    def reference_is_eligible_for_simulation(self):
        if self.status == "reference_ready" and REFERENCE_SYSTEMS[self.referenceId][
            "simulation_eligibility"
        ] != "reference_ready":
            raise ValueError("This reference package requires completed-system measurement")
        if self.status == "component_model_ready":
            if self.modelInputs is None:
                raise ValueError("A component model requires enclosure model inputs")
        return self


class SimulationRequest(BaseModel):
    speakerId: str = Field(min_length=1)
    speakerProfile: SimulationSpeakerProfile | None = None
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
    earlyDecayTime: float
    clarity: float
    definition: float


class FrequencyResponsePoint(BaseModel):
    frequencyHz: float
    gainDb: float


class SpeakerPerformanceProfile(BaseModel):
    id: str
    name: str
    modelType: Literal["catalog_specification_profile", "custom_reference_profile"]
    measurementStatus: Literal["specification_based", "measurement_backed"]
    frequencyRangeHz: tuple[float, float]
    sensitivityDb: float | None = None
    note: str


class SimulationResponse(BaseModel):
    simulationId: str
    impulseResponses: ImpulseResponses
    metrics: SimulationMetrics
    frequencyResponse: list[FrequencyResponsePoint]
    speakerPerformance: SpeakerPerformanceProfile
