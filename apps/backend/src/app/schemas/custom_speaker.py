"""Validated customer configuration for a curated custom-speaker build.

This deliberately models product choices rather than exposing arbitrary driver,
cabinet, or crossover values. Engineering services can derive those values from
the selected platform and return them in a separate response.
"""

from typing import Literal

from pydantic import AliasGenerator, BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

SpeakerFormat = Literal["standmount", "floorstanding", "subwoofer"]
SoundProfile = Literal["balanced", "reference", "warm", "immersive"]
PlatformId = Literal[
    "two_way_compact", "two_way_extended", "three_way_reference", "subwoofer_active"
]
Alignment = Literal["sealed", "ported"]
PersonalisationKind = Literal[
    "none", "engraving", "pattern", "printed_panel", "decal", "custom_artwork"
]


class CustomSpeakerModel(BaseModel):
    """Use camelCase at the API boundary while retaining Pythonic field names."""

    model_config = ConfigDict(
        alias_generator=AliasGenerator(validation_alias=to_camel, serialization_alias=to_camel),
        populate_by_name=True,
    )


class DesignBrief(CustomSpeakerModel):
    format: SpeakerFormat
    sound_profile: SoundProfile
    room_size: Literal["small", "medium", "large"]
    listening_distance_m: float = Field(ge=1.2, le=6.0)


class BassConfiguration(CustomSpeakerModel):
    alignment: Alignment
    bass_character: Literal["tight", "balanced", "extended"]
    tuning_hz: float | None = Field(default=None, ge=24, le=65)
    net_volume_litres: float | None = Field(default=None, gt=0, le=250)
    port_inner_diameter_mm: float | None = Field(default=None, gt=0, le=250)
    port_length_mm: float | None = Field(default=None, gt=0, le=1000)
    damping_description: str | None = Field(default=None, min_length=3, max_length=500)

    @model_validator(mode="after")
    def validate_tuning(self):
        if self.alignment == "sealed" and self.tuning_hz is not None:
            raise ValueError("Sealed alignments do not accept a port tuning frequency")
        if self.alignment == "ported" and self.tuning_hz is None:
            raise ValueError("Ported alignments require a tuning frequency")
        if self.alignment == "ported" and self.net_volume_litres is None:
            raise ValueError("Ported alignments require net enclosure volume")
        return self


class CabinetConfiguration(CustomSpeakerModel):
    size: Literal["compact", "standard", "large"]
    finish: Literal[
        "walnut", "oak", "black_ash", "satin_white", "satin_black", "deep_blue", "custom_colour"
    ]
    finish_family: Literal["veneer", "paint", "premium"]
    grille: Literal["none", "magnetic_fabric", "perforated_metal"]
    base: Literal["plinth", "slim_feet", "stand"]
    edge_profile: Literal["soft_radius", "sculpted_radius"] = "soft_radius"


class Engraving(CustomSpeakerModel):
    text: str = Field(max_length=32)
    font: Literal["modern_sans", "classic_serif"]
    placement: Literal["rear_badge", "side_lower"]


class Artwork(CustomSpeakerModel):
    asset_id: str | None = None
    application: Literal["side_panel", "rear_panel", "grille_badge"]
    treatment: Literal["matte_decal", "uv_print", "inlaid_pattern"]
    rights_confirmed: bool = False
    status: Literal["not_required", "pending_upload", "under_review", "approved", "rejected"] = (
        "pending_upload"
    )


class Personalisation(CustomSpeakerModel):
    kind: PersonalisationKind = "none"
    engraving: Engraving | None = None
    artwork: Artwork | None = None

    @model_validator(mode="after")
    def validate_personalisation(self):
        # Personalisation is a manufacturing-review attribute. It must not
        # prevent the acoustic build from being generated or simulated.
        return self


class CustomSpeakerConfiguration(CustomSpeakerModel):
    version: Literal[1] = 1
    name: str = Field(min_length=1, max_length=80)
    brief: DesignBrief
    platform_id: PlatformId
    bass: BassConfiguration
    cabinet: CabinetConfiguration
    personalisation: Personalisation

    @model_validator(mode="after")
    def validate_platform(self):
        if self.brief.format == "subwoofer" and self.platform_id != "subwoofer_active":
            raise ValueError("Subwoofer builds require the active subwoofer platform")
        if self.brief.format != "subwoofer" and self.platform_id == "subwoofer_active":
            raise ValueError("The active subwoofer platform is only available for subwoofer builds")
        if self.cabinet.base == "stand" and self.brief.format != "standmount":
            raise ValueError("A dedicated stand is only available for standmount builds")
        return self


class DriverSpecification(CustomSpeakerModel):
    role: Literal["tweeter", "midrange", "woofer", "subwoofer"]
    allocation: Literal["platform_controlled"] = "platform_controlled"


class DerivedSpeakerSpecifications(CustomSpeakerModel):
    architecture: Literal["full_range", "two_way", "three_way", "subwoofer"]
    drivers: list[DriverSpecification]
    acoustic_design: "AcousticDesign"
    physical_build: "PhysicalBuild"
    room_recommendation: "RoomRecommendation"
    simulation_profile: "SimulationProfile"
    manufacturing_status: Literal["ready", "requires_design_review"]
    warnings: list[str] = Field(default_factory=list)


class AcousticDesign(CustomSpeakerModel):
    alignment: Alignment
    port_tuning_hz: float | None = None
    net_volume_litres: float | None = None
    port_inner_diameter_mm: float | None = None
    port_length_mm: float | None = None
    damping_description: str | None = None
    bass_character: Literal["tight", "balanced", "extended"]
    voicing_target: SoundProfile
    measurement_status: Literal["requires_driver_and_crossover_validation"]


class PhysicalBuild(CustomSpeakerModel):
    format: SpeakerFormat
    cabinet_size: Literal["compact", "standard", "large"]
    finish: Literal[
        "walnut", "oak", "black_ash", "satin_white", "satin_black", "deep_blue", "custom_colour"
    ]
    finish_family: Literal["veneer", "paint", "premium"]
    grille: Literal["none", "magnetic_fabric", "perforated_metal"]
    base: Literal["plinth", "slim_feet", "stand"]
    edge_profile: Literal["soft_radius", "sculpted_radius"]


class RoomRecommendation(CustomSpeakerModel):
    room_size: Literal["small", "medium", "large"]
    listening_distance_m: float


class SimulationProfile(CustomSpeakerModel):
    status: Literal["reference_ready", "component_model_ready", "requires_measurement"]
    reference_id: PlatformId
    reference_name: str
    source_url: str
    drivers: list[str]
    frequency_range_hz: tuple[float, float]
    sensitivity_db: float | None = None
    nominal_impedance_ohm: int | None = None
    max_spl_db: float | None = None
    crossover_hz: list[float]
    model_inputs: "BoxModelInputs | None" = None
    model_type: Literal[
        "published_system_response", "component_response_model", "requires_measurement"
    ]
    source_assets: list["SourceAsset"]
    simulated_changes: list[str]
    measurement_required_for: list[str]
    compatibility_notes: list[str]


class SourceAsset(CustomSpeakerModel):
    kind: Literal["system_response", "driver_response", "impedance", "crossover", "cabinet"]
    source_url: str
    description: str


class CatalogPlatform(CustomSpeakerModel):
    id: PlatformId
    name: str
    architecture: Literal["two_way", "three_way", "subwoofer"]
    simulation_eligibility: Literal["reference_ready", "requires_measurement"]
    source_url: str


class CustomSpeakerCatalogResponse(CustomSpeakerModel):
    platforms: list[CatalogPlatform]


class SealedBoxModelInputs(CustomSpeakerModel):
    alignment: Literal["sealed"]
    net_volume_litres: float = Field(gt=0, le=250)


class PortedBoxModelInputs(CustomSpeakerModel):
    alignment: Literal["ported"]
    net_volume_litres: float = Field(gt=0, le=250)
    tuning_hz: float = Field(ge=24, le=65)


BoxModelInputs = SealedBoxModelInputs | PortedBoxModelInputs


class CustomSpeakerBuild(CustomSpeakerConfiguration):
    derived: DerivedSpeakerSpecifications
