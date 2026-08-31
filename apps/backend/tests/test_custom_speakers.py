import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


def build_payload() -> dict:
    return {
        "version": 1,
        "name": "Listening Room One",
        "brief": {
            "format": "standmount",
            "soundProfile": "balanced",
            "roomSize": "medium",
            "listeningDistanceM": 2.5,
        },
        "platformId": "two_way_compact",
        "bass": {
            "alignment": "ported",
            "bassCharacter": "balanced",
            "tuningHz": 42,
            "netVolumeLitres": 14,
            "portInnerDiameterMm": 50,
            "portLengthMm": 200,
            "dampingDescription": "150 g Acousto-Q, distributed away from the port",
        },
        "cabinet": {
            "size": "compact",
            "finish": "walnut",
            "finishFamily": "veneer",
            "grille": "magnetic_fabric",
            "base": "stand",
            "edgeProfile": "soft_radius",
        },
        "personalisation": {"kind": "none"},
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("platform_id", "speaker_format"),
    [
        ("two_way_compact", "standmount"),
        ("two_way_extended", "floorstanding"),
        ("three_way_reference", "standmount"),
        ("subwoofer_active", "subwoofer"),
    ],
)
@pytest.mark.parametrize("alignment", ["ported", "sealed"])
async def test_every_builder_platform_and_alignment_produces_a_valid_build(
    platform_id: str, speaker_format: str, alignment: str
):
    payload = build_payload()
    payload["platformId"] = platform_id
    payload["brief"]["format"] = speaker_format
    payload["cabinet"]["base"] = "stand" if speaker_format == "standmount" else "slim_feet"
    payload["bass"]["alignment"] = alignment
    if alignment == "sealed":
        payload["bass"].pop("tuningHz", None)
        payload["bass"].pop("portInnerDiameterMm", None)
        payload["bass"].pop("portLengthMm", None)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=payload)

    assert response.status_code == 201, response.text
    profile = response.json()["derived"]["simulationProfile"]
    assert profile["modelInputs"] is not None


@pytest.mark.asyncio
async def test_custom_speaker_catalog_is_server_owned():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/custom-speakers/catalog")

    assert response.status_code == 200
    platforms = {platform["id"]: platform for platform in response.json()["platforms"]}
    assert platforms["two_way_compact"]["name"] == "SEAS Mimir"
    assert platforms["three_way_reference"]["simulationEligibility"] == "reference_ready"


@pytest.mark.asyncio
async def test_create_custom_speaker_returns_derived_build():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=build_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["platformId"] == "two_way_compact"
    assert body["derived"]["architecture"] == "two_way"
    assert body["derived"]["acousticDesign"]["portTuningHz"] == 42
    assert body["derived"]["physicalBuild"]["finish"] == "walnut"
    assert body["derived"]["roomRecommendation"]["listeningDistanceM"] == 2.5
    assert body["derived"]["simulationProfile"]["status"] == "reference_ready"
    assert body["derived"]["simulationProfile"]["referenceId"] == "two_way_compact"
    assert body["derived"]["simulationProfile"]["referenceName"] == "SEAS Mimir"
    assert body["derived"]["simulationProfile"]["modelType"] == "component_response_model"
    assert {asset["kind"] for asset in body["derived"]["simulationProfile"]["sourceAssets"]} == {
        "driver_response",
        "impedance",
        "crossover",
    }


@pytest.mark.asyncio
async def test_custom_speaker_rejects_ported_build_without_tuning():
    payload = build_payload()
    del payload["bass"]["tuningHz"]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", ["none", "engraving", "pattern", "printed_panel", "decal", "custom_artwork"])
async def test_every_builder_personalisation_option_keeps_build_simulatable(kind: str):
    payload = build_payload()
    if kind == "none":
        payload["personalisation"] = {"kind": kind}
    elif kind == "engraving":
        payload["personalisation"] = {"kind": kind, "engraving": {"text": "", "font": "modern_sans", "placement": "rear_badge"}}
    else:
        payload["personalisation"] = {"kind": kind, "artwork": {"application": "side_panel", "treatment": "matte_decal", "rightsConfirmed": False, "status": "pending_upload"}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["derived"]["simulationProfile"]["modelInputs"] is not None


@pytest.mark.asyncio
async def test_changed_mimir_ported_tuning_releases_estimated_component_model():
    payload = build_payload()
    payload["bass"]["tuningHz"] = 35
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=payload)

    assert response.status_code == 201
    profile = response.json()["derived"]["simulationProfile"]
    assert profile["status"] == "component_model_ready"
    assert profile["modelInputs"] == {
        "alignment": "ported",
        "netVolumeLitres": 14,
        "tuningHz": 35,
    }


@pytest.mark.asyncio
async def test_sealed_mimir_build_releases_component_model_with_volume_input():
    payload = build_payload()
    payload["bass"]["alignment"] = "sealed"
    del payload["bass"]["tuningHz"]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=payload)

    assert response.status_code == 201
    profile = response.json()["derived"]["simulationProfile"]
    assert profile["status"] == "component_model_ready"
    assert profile["modelInputs"] == {"alignment": "sealed", "netVolumeLitres": 14}


@pytest.mark.asyncio
async def test_cosmetic_changes_preserve_verified_acoustic_reference_profile():
    payload = build_payload()
    payload["cabinet"].update(
        finish="satin_white", finishFamily="paint", grille="perforated_metal"
    )
    payload["personalisation"] = {
        "kind": "engraving",
        "engraving": {"text": "Studio One", "font": "modern_sans", "placement": "rear_badge"},
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=payload)

    assert response.status_code == 201
    assert response.json()["derived"]["simulationProfile"]["status"] == "reference_ready"


@pytest.mark.asyncio
async def test_seas_403_reference_configuration_is_simulation_ready():
    payload = build_payload()
    payload["brief"]["format"] = "standmount"
    payload["platformId"] = "three_way_reference"
    payload["bass"].update(
        tuningHz=30,
        netVolumeLitres=44,
        portInnerDiameterMm=67,
        portLengthMm=139.5,
        dampingDescription="Light damping in marked enclosure areas, clear of drivers and port",
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=payload)

    assert response.status_code == 201
    assert response.json()["derived"]["simulationProfile"]["referenceName"] == "SEAS 403 Revisited"
    assert response.json()["derived"]["simulationProfile"]["status"] == "reference_ready"


@pytest.mark.asyncio
async def test_incomplete_reference_package_never_unlocks_simulation_profile():
    payload = build_payload()
    payload["platformId"] = "two_way_extended"
    payload["brief"]["format"] = "floorstanding"
    payload["cabinet"]["base"] = "slim_feet"
    payload["bass"].update(tuningHz=36, netVolumeLitres=55)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/custom-speakers/", json=payload)

    assert response.status_code == 201
    assert response.json()["derived"]["simulationProfile"]["status"] == "component_model_ready"
