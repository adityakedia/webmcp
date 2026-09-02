"""Speaker-specific, specification-backed profiles for the public catalog.

Numeric simulation values (bandwidth, sensitivity) are **derived from
``PUBLIC_CATALOG``** so the catalog remains the single source of truth.
Voicing tilt is the only value not present in the catalog specs — it is a
simulation-only parameter kept here.

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

from .public_catalog import PUBLIC_CATALOG


@dataclass(frozen=True)
class CatalogSpeakerProfile:
    id: str
    name: str
    low_frequency_hz: float
    high_frequency_hz: float
    sensitivity_db: float
    voicing_tilt_db_per_decade: float


# Voicing tilt is simulation-only metadata not present in the catalog specs.
# Negative = warmer (less treble), positive = brighter.
_VOICING_TILT = {
    "contour 20i": -0.15,
    "confidence 20": 0.05,
    "emit 50": 0.2,
    "aether 7": 0.1,
    "terra one": -0.3,
    "vector 12": 0.15,
}


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


def _build_profiles() -> dict[str, CatalogSpeakerProfile]:
    profiles: dict[str, CatalogSpeakerProfile] = {}
    for speaker in PUBLIC_CATALOG:
        name = speaker["name"]
        specs = speaker["specs"]
        low, high = _parse_freq_response(specs)
        sens = _parse_sensitivity(specs)
        tilt = _VOICING_TILT.get(name.casefold(), 0.0)
        speaker_id = name.casefold().replace(" ", "_")
        profiles[name.casefold()] = CatalogSpeakerProfile(
            id=speaker_id,
            name=name,
            low_frequency_hz=low,
            high_frequency_hz=high,
            sensitivity_db=sens,
            voicing_tilt_db_per_decade=tilt,
        )
    return profiles


CATALOG_SPEAKER_PROFILES = _build_profiles()


def get_catalog_profile(speaker_id: str) -> CatalogSpeakerProfile | None:
    return CATALOG_SPEAKER_PROFILES.get(speaker_id.casefold())


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
    reference_band = (frequencies >= 500) & (frequencies <= 1000)
    transfer /= np.maximum(np.median(np.abs(transfer[reference_band])), 1e-12)
    return frequencies, transfer


def apply_catalog_transfer(
    rir: np.ndarray, sample_rate: int, profile: CatalogSpeakerProfile
) -> np.ndarray:
    _, transfer = catalog_transfer_function(profile, sample_rate, len(rir))
    return np.fft.irfft(np.fft.rfft(rir) * transfer, n=len(rir)).real
