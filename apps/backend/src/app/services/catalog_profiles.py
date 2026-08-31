"""Speaker-specific, specification-backed profiles for the public catalog.

The retail catalog does not include completed-system measurement files. These
profiles therefore model each product's published bandwidth, sensitivity and
voicing as a clearly-labelled estimate; they are not presented as measured FRD
or directivity data. Custom reference designs continue to use their supplied
measurement/component data in ``component_transfer``.
"""

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


CATALOG_SPEAKER_PROFILES = {
    profile.name.casefold(): profile
    for profile in (
        CatalogSpeakerProfile("contour_20i", "Contour 20i", 42, 25_000, 86, -0.15),
        CatalogSpeakerProfile("confidence_20", "Confidence 20", 39, 28_000, 87, 0.05),
        CatalogSpeakerProfile("emit_50", "Emit 50", 31, 25_000, 88.5, 0.2),
        CatalogSpeakerProfile("aether_7", "Aether 7", 24, 32_000, 91, 0.1),
        CatalogSpeakerProfile("terra_one", "Terra One", 36, 21_000, 88, -0.3),
        CatalogSpeakerProfile("vector_12", "Vector 12", 28, 26_000, 90, 0.15),
    )
}


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
