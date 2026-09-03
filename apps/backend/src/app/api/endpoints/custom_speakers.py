"""Curated custom-speaker build API."""

from fastapi import APIRouter

from app.schemas.custom_speaker import (
    AcousticDesign,
    CatalogPlatform,
    CustomSpeakerBuild,
    CustomSpeakerCatalogResponse,
    CustomSpeakerConfiguration,
    DerivedSpeakerSpecifications,
    DriverSpecification,
    PhysicalBuild,
    RoomRecommendation,
    SimulationProfile,
)
from app.services.custom_speaker_catalog import REFERENCE_SYSTEMS
from app.services.custom_speaker_specs import derive_product_specs

router = APIRouter()


PLATFORM_SPECS = {
    "two_way_compact": ("two_way", ["tweeter", "woofer"]),
    "two_way_extended": ("two_way", ["tweeter", "woofer"]),
    "three_way_reference": ("three_way", ["tweeter", "midrange", "woofer"]),
    "subwoofer_active": ("subwoofer", ["subwoofer"]),
}


@router.get("/catalog", response_model=CustomSpeakerCatalogResponse)
async def get_custom_speaker_catalog() -> CustomSpeakerCatalogResponse:
    """Expose the server-owned reference platforms used by the custom builder."""
    return CustomSpeakerCatalogResponse(
        platforms=[
            CatalogPlatform(
                id=platform_id,
                name=reference["name"],
                architecture=PLATFORM_SPECS[platform_id][0],
                simulation_eligibility=reference["simulation_eligibility"],
                source_url=reference["source_url"],
            )
            for platform_id, reference in REFERENCE_SYSTEMS.items()
        ]
    )


@router.post("/", response_model=CustomSpeakerBuild, status_code=201)
async def create_custom_speaker(config: CustomSpeakerConfiguration) -> CustomSpeakerBuild:
    """Validate a customer configuration and return its platform-derived build."""
    architecture, roles = PLATFORM_SPECS[config.platform_id]
    reference = REFERENCE_SYSTEMS[config.platform_id]
    matches_alignment = config.bass.alignment == reference["alignment"]
    matches_tuning = (
        reference["port_tuning_hz"] is None or config.bass.tuning_hz == reference["port_tuning_hz"]
    )
    matches_format = config.brief.format == reference["format"] if "format" in reference else True
    matches_volume = config.bass.net_volume_litres == reference.get("net_volume_litres")
    matches_port = config.bass.port_inner_diameter_mm == reference.get(
        "port_inner_diameter_mm"
    ) and config.bass.port_length_mm == reference.get("port_length_mm")
    profile_ready = (
        reference["simulation_eligibility"] == "reference_ready"
        and matches_alignment
        and matches_tuning
        and matches_format
        and matches_volume
        and matches_port
    )
    # Every valid builder configuration must be usable by the simulator. A
    # component model is the deterministic fallback for unmeasured systems.
    component_model_ready = (
        config.bass.net_volume_litres is not None
        and (config.bass.alignment == "sealed" or config.bass.tuning_hz is not None)
    )
    warnings = [
        "Acoustic response, sensitivity and impedance require the selected drivers, net "
        "enclosure volume, port geometry and crossover to be measured and validated."
    ]
    simulated_changes = ["room geometry", "room absorption", "speaker and listener position"]
    if component_model_ready:
        simulated_changes.extend(["net enclosure volume", "bass alignment", "port tuning"])
    measurement_required_for = [
        "driver substitution",
        "net volume",
        "port geometry",
        "baffle geometry",
        "damping",
        "crossover parts",
    ]
    if config.personalisation.kind != "none":
        warnings.append("Personalisation requires design review before production.")
    if config.cabinet.finish == "custom_colour":
        warnings.append("Custom colours require finish-sample approval.")

    build = CustomSpeakerBuild(
        **config.model_dump(),
        derived=DerivedSpeakerSpecifications(
            architecture=architecture,
            drivers=[DriverSpecification(role=role) for role in roles],
            acoustic_design=AcousticDesign(
                alignment=config.bass.alignment,
                port_tuning_hz=config.bass.tuning_hz,
                net_volume_litres=config.bass.net_volume_litres,
                port_inner_diameter_mm=config.bass.port_inner_diameter_mm,
                port_length_mm=config.bass.port_length_mm,
                damping_description=config.bass.damping_description,
                bass_character=config.bass.bass_character,
                voicing_target=config.brief.sound_profile,
                measurement_status="requires_driver_and_crossover_validation",
            ),
            physical_build=PhysicalBuild(
                format=config.brief.format,
                cabinet_size=config.cabinet.size,
                finish=config.cabinet.finish,
                finish_family=config.cabinet.finish_family,
                grille=config.cabinet.grille,
                base=config.cabinet.base,
                edge_profile=config.cabinet.edge_profile,
            ),
            room_recommendation=RoomRecommendation(
                room_size=config.brief.room_size,
                listening_distance_m=config.brief.listening_distance_m,
            ),
            simulation_profile=SimulationProfile(
                status=(
                    "reference_ready"
                    if profile_ready
                    else "component_model_ready"
                    if component_model_ready
                    else "component_model_ready"
                ),
                reference_id=config.platform_id,
                reference_name=reference["name"],
                source_url=reference["source_url"],
                drivers=reference["drivers"],
                frequency_range_hz=tuple(reference["frequency_range_hz"]),
                sensitivity_db=reference["sensitivity_db"],
                nominal_impedance_ohm=reference["nominal_impedance_ohm"],
                max_spl_db=reference["max_spl_db"],
                crossover_hz=reference["crossover_hz"],
                model_inputs=(
                    {"alignment": "sealed", "net_volume_litres": config.bass.net_volume_litres}
                    if component_model_ready and config.bass.alignment == "sealed"
                    else {
                        "alignment": "ported",
                        "net_volume_litres": config.bass.net_volume_litres,
                        "tuning_hz": config.bass.tuning_hz,
                    }
                    if component_model_ready
                    else None
                ),
                model_type=reference["model_type"],
                source_assets=reference["source_assets"],
                simulated_changes=simulated_changes,
                measurement_required_for=measurement_required_for,
                compatibility_notes=(
                    [
                        "Matches the documented reference alignment, format, net volume "
                        "and port geometry."
                    ]
                    if profile_ready
                    else [
                        "Uses the documented CA18RNX driver data and selected enclosure alignment, "
                        "volume and tuning. This is an estimated component model, not a measured "
                        "completed-speaker response."
                    ]
                    if component_model_ready
                    else ["The selected configuration could not produce a simulation model."]
                ),
            ),
            manufacturing_status="requires_design_review",
            warnings=warnings,
        ),
    )
    build.specs = derive_product_specs({"derived": build.derived.model_dump(by_alias=True)})
    return build
