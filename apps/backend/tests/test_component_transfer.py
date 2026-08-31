import numpy as np

from app.services.component_transfer import (
    aphel_transfer_function,
    apply_aphel_transfer,
    apply_mimir_ported_box_transfer,
    apply_mimir_sealed_box_transfer,
    apply_mimir_transfer,
    apply_seas_403_transfer,
    mimir_ported_box_transfer_function,
    mimir_sealed_box_transfer_function,
    mimir_transfer_function,
    seas_403_transfer_function,
)


def test_mimir_transfer_uses_imported_driver_curves():
    frequencies, transfer = mimir_transfer_function(44100, 8192)
    assert len(frequencies) == len(transfer)
    assert np.isfinite(transfer).all()
    assert np.any(np.abs(transfer) > 0)


def test_mimir_transfer_changes_an_impulse_response():
    rir = np.zeros(4096)
    rir[0] = 1
    modeled = apply_mimir_transfer(rir, 44100)
    assert not np.allclose(modeled, rir)


def test_sealed_mimir_model_uses_selected_net_volume():
    frequencies, compact_transfer = mimir_sealed_box_transfer_function(44100, 8192, 8)
    _, large_transfer = mimir_sealed_box_transfer_function(44100, 8192, 20)
    low_frequency = np.argmin(np.abs(frequencies - 60))
    assert not np.isclose(abs(compact_transfer[low_frequency]), abs(large_transfer[low_frequency]))
    rir = np.zeros(4096)
    rir[0] = 1
    assert not np.allclose(apply_mimir_sealed_box_transfer(rir, 44100, 14), rir)


def test_ported_mimir_model_uses_selected_tuning():
    frequencies, low_tuned = mimir_ported_box_transfer_function(44100, 8192, 30)
    _, high_tuned = mimir_ported_box_transfer_function(44100, 8192, 55)
    low_frequency = np.argmin(np.abs(frequencies - 35))
    assert not np.isclose(abs(low_tuned[low_frequency]), abs(high_tuned[low_frequency]))
    rir = np.zeros(4096)
    rir[0] = 1
    assert not np.allclose(apply_mimir_ported_box_transfer(rir, 44100, 30), rir)


def test_aphel_transfer_uses_official_in_cabinet_measurement_data():
    frequencies, transfer = aphel_transfer_function(44100, 8192)
    assert len(frequencies) == len(transfer)
    assert np.isfinite(transfer).all()
    rir = np.zeros(4096)
    rir[0] = 1
    assert not np.allclose(apply_aphel_transfer(rir, 44100), rir)


def test_seas_403_transfer_uses_published_completed_system_curve():
    frequencies, transfer = seas_403_transfer_function(44100, 8192)
    assert len(frequencies) == len(transfer)
    assert np.isfinite(transfer).all()
    rir = np.zeros(4096)
    rir[0] = 1
    assert not np.allclose(apply_seas_403_transfer(rir, 44100), rir)
