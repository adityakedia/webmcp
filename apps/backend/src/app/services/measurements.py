"""Import and describe frequency-response (FRD) and impedance (ZMA) datasets."""

from dataclasses import dataclass
from pathlib import Path

MEASUREMENT_ROOT = Path(__file__).resolve().parents[3] / "data" / "driver_measurements"
DATASHEET_ROOT = Path(__file__).resolve().parents[3] / "data" / "component_datasheets"


@dataclass(frozen=True)
class MeasurementFile:
    driver_id: str
    response_path: Path
    impedance_path: Path
    source_url: str
    measurement_notes: str


@dataclass(frozen=True)
class ResponseCurve:
    frequency_hz: tuple[float, ...]
    magnitude_db: tuple[float, ...]
    phase_degrees: tuple[float, ...]


@dataclass(frozen=True)
class ThieleSmallParameters:
    """Manufacturer-published low-frequency parameters for enclosure modelling."""

    fs_hz: float
    vas_litres: float
    qts: float
    qes: float
    qms: float
    re_ohm: float
    le_mh: float
    bl_n_per_a: float
    mms_g: float
    cms_mm_per_n: float
    sd_cm2: float
    xmax_mm_peak: float
    datasheet_path: Path
    source_url: str


THIELE_SMALL_PARAMETERS = {
    "seas_ca18rnx_h1215": ThieleSmallParameters(
        fs_hz=35.0,
        vas_litres=33.0,
        qts=0.31,
        qes=0.37,
        qms=1.90,
        re_ohm=5.8,
        le_mh=1.2,
        bl_n_per_a=7.2,
        mms_g=14.0,
        cms_mm_per_n=1.4,
        sd_cm2=136.0,
        xmax_mm_peak=6.0,
        datasheet_path=DATASHEET_ROOT / "seas_ca18rnx_h1215_datasheet.pdf",
        source_url="https://www.seas.no/images/stories/prestige/pdfdatasheet/H1215_CA18RNX_Datasheet.pdf",
    )
}


COMPONENT_MEASUREMENTS = {
    "seas_ca18rnx_h1215": MeasurementFile(
        driver_id="SEAS CA18RNX / H1215",
        response_path=MEASUREMENT_ROOT / "seas_ca18rnx_h1215.frd",
        impedance_path=MEASUREMENT_ROOT / "seas_ca18rnx_h1215.zma",
        source_url="https://rjbaudio.com/Audiofiles/Driver%20FRD%20files.html",
        measurement_notes=(
            "FRD/ZMA data from RJB Audio; its archive documents the measurement "
            "conditions and cautions that finite-baffle data must be corrected per build."
        ),
    ),
    "seas_27tdfc_h1189": MeasurementFile(
        driver_id="SEAS 27TDFC / H1189",
        response_path=MEASUREMENT_ROOT / "seas_27tdfc_h1189.frd",
        impedance_path=MEASUREMENT_ROOT / "seas_27tdfc_h1189.zma",
        source_url="https://rjbaudio.com/Audiofiles/Driver%20FRD%20files.html",
        measurement_notes=(
            "FRD/ZMA data from RJB Audio; use with the documented baffle and crossover "
            "conditions rather than as a completed-system measurement."
        ),
    ),
}


def load_response_curve(path: Path) -> ResponseCurve:
    """Load a standard three-column FRD/ZMA text file."""
    rows = []
    for line in path.read_text().splitlines():
        fields = line.split()
        if len(fields) != 3 or fields[0].startswith("*"):
            continue
        rows.append(tuple(float(value) for value in fields))
    if not rows:
        raise ValueError(f"No measurement rows found in {path}")
    frequency_hz, magnitude_db, phase_degrees = zip(*rows)
    return ResponseCurve(frequency_hz, magnitude_db, phase_degrees)


def load_vituix_curve(path: Path) -> ResponseCurve:
    """Load a VituixCAD curve exported as ``Curve = [ ... ];``."""
    rows = []
    reading_curve = False
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if line.startswith("Curve = ["):
            reading_curve = True
            continue
        if reading_curve:
            data_line, closing_delimiter, _ = line.partition("];")
            fields = data_line.split()
            if len(fields) == 3:
                rows.append(tuple(float(value) for value in fields))
            if closing_delimiter:
                break
    if not rows:
        raise ValueError(f"No VituixCAD curve rows found in {path}")
    frequency_hz, magnitude_db, phase_degrees = zip(*rows)
    return ResponseCurve(frequency_hz, magnitude_db, phase_degrees)
