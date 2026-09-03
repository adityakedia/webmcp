"""Measured-driver transfer model for the documented SEAS Mimir reference build."""

import numpy as np
from scipy.signal import butter, sosfreqz

from app.services.measurements import (
    COMPONENT_MEASUREMENTS,
    THIELE_SMALL_PARAMETERS,
    load_response_curve,
    load_vituix_curve,
)

MIMIR_REFERENCE = {
    "source_url": "https://www.seas.no/images/stories/diykits/pdfdataheet/mimir_plans.pdf",
    "cabinet_volume_l": 14.0,
    "port_inner_diameter_mm": 50.0,
    "port_length_mm": 200.0,
    "damping_mass_g": 150.0,
    "crossover_hz": 2200.0,
    "measurement_axis_degrees": 15.0,
    "port_tuning_hz": 42.0,
}


def _interpolate_complex_curve(driver_key: str, frequencies_hz: np.ndarray) -> np.ndarray:
    curve = load_response_curve(COMPONENT_MEASUREMENTS[driver_key].response_path)
    source_frequency = np.asarray(curve.frequency_hz)
    magnitude = 10 ** (np.asarray(curve.magnitude_db) / 20)
    phase = np.deg2rad(np.asarray(curve.phase_degrees))
    complex_curve = magnitude * np.exp(1j * phase)
    return np.interp(frequencies_hz, source_frequency, complex_curve.real) + 1j * np.interp(
        frequencies_hz, source_frequency, complex_curve.imag
    )


def mimir_transfer_function(sample_rate: int, fft_size: int) -> tuple[np.ndarray, np.ndarray]:
    """Return the Mimir reference system's modeled complex response.

    The driver curves are imported from FRD data. The documented fourth-order
    acoustic Linkwitz-Riley crossover at 2.2 kHz provides the two driver paths.
    This is a reference-design model, not a substitute for remeasurement after
    changes to cabinet, baffle, port, damping, or crossover parts.
    """
    frequencies = np.fft.rfftfreq(fft_size, 1 / sample_rate)
    normalized = np.clip(frequencies / (sample_rate / 2), 1e-8, 0.999999)
    normalized_crossover = MIMIR_REFERENCE["crossover_hz"] / (sample_rate / 2)
    frequency_grid = normalized * np.pi
    lowpass = sosfreqz(
        butter(4, normalized_crossover, btype="lowpass", output="sos"), worN=frequency_grid
    )[1]
    highpass = sosfreqz(
        butter(4, normalized_crossover, btype="highpass", output="sos"), worN=frequency_grid
    )[1]
    woofer = _interpolate_complex_curve("seas_ca18rnx_h1215", frequencies)
    tweeter = _interpolate_complex_curve("seas_27tdfc_h1189", frequencies)
    transfer = woofer * lowpass + tweeter * highpass
    reference_band = (frequencies >= 500) & (frequencies <= 1000)
    transfer /= np.maximum(np.median(np.abs(transfer[reference_band])), 1e-12)
    return frequencies, transfer


def apply_mimir_transfer(rir: np.ndarray, sample_rate: int) -> np.ndarray:
    fft_size = len(rir)
    _, transfer = mimir_transfer_function(sample_rate, fft_size)
    return np.fft.irfft(np.fft.rfft(rir) * transfer, n=fft_size).real


def apply_acoustic_modifiers(
    rir: np.ndarray,
    sample_rate: int,
    *,
    baffle_step_db: float = 0,
    grille_high_frequency_trim_db: float = 0,
    damping_low_frequency_trim_db: float = 0,
) -> np.ndarray:
    """Apply restrained response adjustments resolved from fixed builder options.

    These are broad shelves, not a claim of measured completed-speaker response.
    """
    fft_size = len(rir)
    frequencies = np.fft.rfftfreq(fft_size, 1 / sample_rate)
    baffle_weight = 1 / (1 + (frequencies / 700) ** 2)
    damping_weight = 1 / (1 + (frequencies / 180) ** 2)
    grille_weight = 1 / (1 + (4000 / np.maximum(frequencies, 1)) ** 4)
    adjustment_db = (
        baffle_step_db * baffle_weight
        + damping_low_frequency_trim_db * damping_weight
        + grille_high_frequency_trim_db * grille_weight
    )
    return np.fft.irfft(np.fft.rfft(rir) * 10 ** (adjustment_db / 20), n=fft_size).real


def mimir_sealed_box_transfer_function(
    sample_rate: int, fft_size: int, net_volume_litres: float
) -> tuple[np.ndarray, np.ndarray]:
    """Model the CA18RNX closed-box acoustic high-pass from official T/S values.

    This is the standard small-signal sealed-box relationship. It intentionally
    does not model vented boxes, baffle diffraction, or altered crossover parts.
    """
    parameters = THIELE_SMALL_PARAMETERS["seas_ca18rnx_h1215"]
    alpha = parameters.vas_litres / net_volume_litres
    resonance_hz = parameters.fs_hz * np.sqrt(1 + alpha)
    qtc = parameters.qts * np.sqrt(1 + alpha)
    frequencies = np.fft.rfftfreq(fft_size, 1 / sample_rate)
    angular_frequency = 2 * np.pi * frequencies
    resonance = 2 * np.pi * resonance_hz
    numerator = -(angular_frequency**2)
    denominator = resonance**2 - angular_frequency**2 + 1j * angular_frequency * resonance / qtc
    sealed_highpass = numerator / np.where(np.abs(denominator) > 0, denominator, 1)
    _, mimir = mimir_transfer_function(sample_rate, fft_size)
    transfer = mimir * sealed_highpass
    reference_band = (frequencies >= 500) & (frequencies <= 1000)
    transfer /= np.maximum(np.median(np.abs(transfer[reference_band])), 1e-12)
    return frequencies, transfer


def apply_mimir_sealed_box_transfer(
    rir: np.ndarray, sample_rate: int, net_volume_litres: float
) -> np.ndarray:
    _, transfer = mimir_sealed_box_transfer_function(sample_rate, len(rir), net_volume_litres)
    return np.fft.irfft(np.fft.rfft(rir) * transfer, n=len(rir)).real


def mimir_ported_box_transfer_function(
    sample_rate: int, fft_size: int, tuning_hz: float
) -> tuple[np.ndarray, np.ndarray]:
    """Estimate a changed Mimir vented alignment from the selected tuning.

    The response is a relative fourth-order acoustic high-pass adjustment to
    the documented 42 Hz Mimir reference. It preserves the measured driver
    and crossover response while making the selected tuning audible.
    """
    frequencies, mimir = mimir_transfer_function(sample_rate, fft_size)
    grid = np.clip(frequencies / (sample_rate / 2), 1e-8, 0.999999) * np.pi
    current = sosfreqz(
        butter(4, tuning_hz / (sample_rate / 2), btype="highpass", output="sos"), worN=grid
    )[1]
    reference = sosfreqz(
        butter(
            4,
            MIMIR_REFERENCE["port_tuning_hz"] / (sample_rate / 2),
            btype="highpass",
            output="sos",
        ),
        worN=grid,
    )[1]
    adjustment = current / np.where(np.abs(reference) > 1e-12, reference, 1)
    transfer = mimir * adjustment
    reference_band = (frequencies >= 500) & (frequencies <= 1000)
    transfer /= np.maximum(np.median(np.abs(transfer[reference_band])), 1e-12)
    return frequencies, transfer


def apply_mimir_ported_box_transfer(
    rir: np.ndarray, sample_rate: int, tuning_hz: float
) -> np.ndarray:
    _, transfer = mimir_ported_box_transfer_function(sample_rate, len(rir), tuning_hz)
    return np.fft.irfft(np.fft.rfft(rir) * transfer, n=len(rir)).real


APHEL_DATA_ROOT = (
    COMPONENT_MEASUREMENTS["seas_ca18rnx_h1215"].response_path.parents[1]
    / "reference_designs"
    / "aphel"
    / "xo_data"
)
SEAS_403_DATA_ROOT = APHEL_DATA_ROOT.parents[1] / "seas_403"
APHEL_REFERENCE = {
    "source_url": "https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip",
    "cabinet_volume_l": 55.0,
    "port_tuning_hz": 36.0,
    "crossover_hz": 2240.0,
}


def aphel_transfer_function(sample_rate: int, fft_size: int) -> tuple[np.ndarray, np.ndarray]:
    """Model the official APHEL in-cabinet, on-axis driver data at its 2.24 kHz handoff."""
    frequencies = np.fft.rfftfreq(fft_size, 1 / sample_rate)
    normalized = np.clip(frequencies / (sample_rate / 2), 1e-8, 0.999999)
    grid = normalized * np.pi
    crossover = APHEL_REFERENCE["crossover_hz"] / (sample_rate / 2)
    lowpass = sosfreqz(butter(3, crossover, btype="lowpass", output="sos"), worN=grid)[1]
    highpass = sosfreqz(butter(3, crossover, btype="highpass", output="sos"), worN=grid)[1]
    woofer_curve = load_vituix_curve(APHEL_DATA_ROOT / "Wspl_00.txt")
    tweeter_curve = load_vituix_curve(APHEL_DATA_ROOT / "Tspl_00.txt")

    def interpolate(curve):
        source_frequency = np.asarray(curve.frequency_hz)
        response = 10 ** (np.asarray(curve.magnitude_db) / 20) * np.exp(
            1j * np.deg2rad(np.asarray(curve.phase_degrees))
        )
        return np.interp(frequencies, source_frequency, response.real) + 1j * np.interp(
            frequencies, source_frequency, response.imag
        )

    transfer = interpolate(woofer_curve) * lowpass + interpolate(tweeter_curve) * highpass
    reference_band = (frequencies >= 500) & (frequencies <= 1000)
    transfer /= np.maximum(np.median(np.abs(transfer[reference_band])), 1e-12)
    return frequencies, transfer


def apply_aphel_transfer(rir: np.ndarray, sample_rate: int) -> np.ndarray:
    _, transfer = aphel_transfer_function(sample_rate, len(rir))
    return np.fft.irfft(np.fft.rfft(rir) * transfer, n=len(rir)).real


SEAS_403_REFERENCE = {
    "source_url": "https://www.seas.no/index.php?Itemid=250&catid=66%3Aseas-diy-kits&id=651%3Aseas-403-revisited-kit&option=com_content&view=article",
    "cabinet_volume_l": 44.0,
    "port_inner_diameter_mm": 67.0,
    "port_length_mm": 139.5,
    "port_tuning_hz": 30.0,
    "crossover_hz": (430.0, 2350.0),
}


def seas_403_transfer_function(sample_rate: int, fft_size: int) -> tuple[np.ndarray, np.ndarray]:
    """Return the published SEAS 403 VituixCAD completed-system response.

    ``ALL_SPL.txt`` is the system curve in the matching supplied crossover
    project. It is retained as a complex response instead of inventing a
    filter from headline crossover frequencies.
    """
    frequencies = np.fft.rfftfreq(fft_size, 1 / sample_rate)
    curve = load_vituix_curve(SEAS_403_DATA_ROOT / "ALL_SPL.txt")
    source_frequency = np.asarray(curve.frequency_hz)
    response = 10 ** (np.asarray(curve.magnitude_db) / 20) * np.exp(
        1j * np.deg2rad(np.asarray(curve.phase_degrees))
    )
    transfer = np.interp(frequencies, source_frequency, response.real) + 1j * np.interp(
        frequencies, source_frequency, response.imag
    )
    reference_band = (frequencies >= 500) & (frequencies <= 1000)
    transfer /= np.maximum(np.median(np.abs(transfer[reference_band])), 1e-12)
    return frequencies, transfer


def apply_seas_403_transfer(rir: np.ndarray, sample_rate: int) -> np.ndarray:
    _, transfer = seas_403_transfer_function(sample_rate, len(rir))
    return np.fft.irfft(np.fft.rfft(rir) * transfer, n=len(rir)).real
