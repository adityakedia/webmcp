"""Speaker-specific, specification-backed profiles for the public catalog.

Numeric simulation values (bandwidth, sensitivity) are derived from the
database catalog row so the catalog remains the single source of truth.
Simulation values are derived from the database catalog specifications.

The retail catalog does not include completed-system measurement files. These
profiles therefore model each product's published bandwidth, sensitivity and
voicing as a clearly-labelled estimate; they are not presented as measured FRD
or directivity data. Custom reference designs continue to use their supplied
measurement/component data in ``component_transfer``.
"""

import re
from dataclasses import dataclass

import numpy as np
from scipy.signal import butter, sosfreqz


@dataclass(frozen=True)
class CatalogSpeakerProfile:
    id: str
    name: str
    low_frequency_hz: float
    high_frequency_hz: float
    sensitivity_db: float
    voicing_tilt_db_per_decade: float
    crossover_hz: tuple[float, ...]
    directivity_alpha: float | None
    maximum_spl_db: float | None
    system: str
    active: bool
    room_correction: bool


def _spec_value(specs: list[list[str]], label: str) -> str:
    return next((value for key, value in specs if key == label), "")


def _parse_frequencies(value: str) -> tuple[float, ...]:
    return tuple(
        float(hz or khz) * (1000 if khz else 1)
        for hz, khz in re.findall(r"([\d.]+)\s*Hz|([\d.]+)\s*kHz", value)
    )


def _parse_freq_response(specs: list[list[str]]) -> tuple[float, float]:
    """Extract (low, high) Hz from a 'Frequency response' spec like '42 Hz – 25 kHz (±3 dB)'."""
    for key, value in specs:
        if key == "Frequency response":
            nums = re.findall(r"([\d.]+)\s*Hz|([\d.]+)\s*kHz", value)
            low = float(nums[0][0]) if nums and nums[0][0] else 0.0
            high = float(nums[1][1]) * 1000 if len(nums) > 1 and nums[1][1] else 0.0
            return low, high
    return 20.0, 20_000.0


def _parse_sensitivity(specs: list[list[str]]) -> float:
    """Extract sensitivity in dB from a spec like '86 dB (2.83 V / 1 m)' or '88 dB (built-in amplification)'."""
    for key, value in specs:
        if key == "Sensitivity":
            match = re.search(r"([\d.]+)\s*dB", value)
            if match:
                return float(match.group(1))
    return 87.0


def _parse_directivity_alpha(specs: list[list[str]]) -> float | None:
    """Map published horizontal dispersion to a first-order source pattern.

    ``CardioidFamily`` uses alpha=0 for figure-eight, 0.5 for cardioid, and
    progressively larger values for wider patterns.
    """
    value = _spec_value(specs, "Directivity").lower()
    if "dipole" in value or "figure-of-eight" in value:
        return 0.0
    angle = re.search(r"(?:±\s*)?([\d.]+)°", value)
    if not angle:
        return 0.7 if any(word in value for word in ("controlled", "waveguide", "coaxial")) else None
    horizontal_half_angle = float(angle.group(1)) / (2 if "×" in value and "±" not in value else 1)
    return min(0.85, max(0.5, 0.5 + (horizontal_half_angle - 30) / 150))


def build_catalog_profile(speaker: dict) -> CatalogSpeakerProfile:
    """Build a simulation profile from one database catalog row."""
    name = speaker["name"]
    specs = speaker["specs"]
    low, high = _parse_freq_response(specs)
    system = _spec_value(specs, "System")
    amplification = _spec_value(specs, "Amplification").lower()
    room_correction = _spec_value(specs, "Room correction").lower()
    maximum_spl = re.search(r"([\d.]+)\s*dB", _spec_value(specs, "Maximum SPL"))
    return CatalogSpeakerProfile(
        id=speaker["id"], name=name, low_frequency_hz=low, high_frequency_hz=high,
        sensitivity_db=_parse_sensitivity(specs),
        voicing_tilt_db_per_decade=0.0,
        crossover_hz=_parse_frequencies(_spec_value(specs, "Crossover frequency")),
        directivity_alpha=_parse_directivity_alpha(specs),
        maximum_spl_db=float(maximum_spl.group(1)) if maximum_spl else None,
        system=system,
        active="active" in system.lower() or "built-in" in amplification,
        room_correction=room_correction not in ("", "none"),
    )


def catalog_transfer_function(
    profile: CatalogSpeakerProfile, sample_rate: int, fft_size: int
) -> tuple[np.ndarray, np.ndarray]:
    """Create a relative complex transfer function from declared catalog specs."""
    frequencies = np.fft.rfftfreq(fft_size, 1 / sample_rate)
    nyquist = sample_rate / 2
    grid = np.clip(frequencies / nyquist, 1e-8, 0.999999) * np.pi
    highpass = sosfreqz(
        butter(2, min(profile.low_frequency_hz / nyquist, 0.999), btype="highpass", output="sos"),
        worN=grid,
    )[1]
    upper = min(profile.high_frequency_hz, nyquist * 0.999)
    lowpass = sosfreqz(butter(2, upper / nyquist, btype="lowpass", output="sos"), worN=grid)[1]
    safe_frequency = np.maximum(frequencies, 20)
    tilt_db = profile.voicing_tilt_db_per_decade * np.log10(safe_frequency / 1000)
    transfer = highpass * lowpass * 10 ** (tilt_db / 20)
    # A crossover changes phase even when its summed on-axis magnitude is flat.
    # Apply one stable first-order all-pass section per published crossover.
    angular_frequency = 2j * np.pi * frequencies
    for crossover_hz in profile.crossover_hz:
        crossover = 2 * np.pi * crossover_hz
        transfer *= (angular_frequency - crossover) / (angular_frequency + crossover)
    reference_band = (frequencies >= 500) & (frequencies <= 1000)
    transfer /= np.maximum(np.median(np.abs(transfer[reference_band])), 1e-12)
    transfer *= 10 ** ((profile.sensitivity_db - 87.0) / 20)
    return frequencies, transfer


def apply_catalog_transfer(
    rir: np.ndarray, sample_rate: int, profile: CatalogSpeakerProfile
) -> np.ndarray:
    _, transfer = catalog_transfer_function(profile, sample_rate, len(rir))
    return np.fft.irfft(np.fft.rfft(rir) * transfer, n=len(rir)).real
