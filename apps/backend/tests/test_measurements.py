import hashlib
import json

from app.services.measurements import (
    COMPONENT_MEASUREMENTS,
    THIELE_SMALL_PARAMETERS,
    load_response_curve,
    load_vituix_curve,
)


def test_imported_component_measurements_are_parseable():
    for measurement in COMPONENT_MEASUREMENTS.values():
        response = load_response_curve(measurement.response_path)
        impedance = load_response_curve(measurement.impedance_path)
        assert len(response.frequency_hz) >= 100
        assert len(impedance.frequency_hz) >= 100
        assert response.frequency_hz[0] > 0


def test_official_aphel_vituix_response_is_parseable():
    curve = load_vituix_curve(
        COMPONENT_MEASUREMENTS["seas_ca18rnx_h1215"].response_path.parents[1]
        / "reference_designs/aphel/xo_data/Wspl_00.txt"
    )
    assert len(curve.frequency_hz) > 100
    assert curve.phase_degrees[0] != 0


def test_manufacturer_thiele_small_source_is_available_for_mimir_woofer():
    parameters = THIELE_SMALL_PARAMETERS["seas_ca18rnx_h1215"]
    assert parameters.datasheet_path.is_file()
    assert parameters.fs_hz == 35
    assert parameters.vas_litres == 33
    assert parameters.qts == 0.31


def test_complete_seas_403_measurement_package_is_available():
    data_root = COMPONENT_MEASUREMENTS["seas_ca18rnx_h1215"].response_path.parents[1]
    root = data_root / "reference_designs/seas_403"
    curves = [root / "B_SPL_000.txt", root / "M_SPL_000.txt", root / "D_SPL_000.txt"]
    impedances = [root / "B_IMP.txt", root / "M_IMP.txt", root / "D_IMP.txt"]
    assert all(path.is_file() for path in [*curves, *impedances, root / "ALL_SPL.txt"])
    assert all(len(load_vituix_curve(path).frequency_hz) > 100 for path in [*curves, *impedances])


def test_measurement_manifest_hashes_match_local_source_assets():
    data_root = COMPONENT_MEASUREMENTS["seas_ca18rnx_h1215"].response_path.parents[1]
    manifest = json.loads((data_root / "measurement_manifest.json").read_text())
    for asset in manifest["assets"]:
        checksum = hashlib.sha256((data_root / asset["path"]).read_bytes()).hexdigest()
        assert checksum == asset["sha256"]
