import numpy as np

from app.services.catalog_profiles import (
    catalog_transfer_function,
    get_catalog_profile,
)


def test_every_public_catalog_speaker_has_a_distinct_profile():
    names = ["Contour 20i", "Confidence 20", "Emit 50", "Aether 7", "Terra One", "Vector 12"]
    profiles = [get_catalog_profile(name) for name in names]
    assert all(profiles)
    assert len({profile.id for profile in profiles if profile}) == len(names)


def test_catalog_profiles_produce_speaker_specific_transfer_functions():
    contour = get_catalog_profile("Contour 20i")
    terra = get_catalog_profile("Terra One")
    assert contour and terra
    frequencies, contour_transfer = catalog_transfer_function(contour, 44_100, 8_192)
    _, terra_transfer = catalog_transfer_function(terra, 44_100, 8_192)
    low_band = np.argmin(np.abs(frequencies - 30))
    high_band = np.argmin(np.abs(frequencies - 20_000))
    assert not np.isclose(abs(contour_transfer[low_band]), abs(terra_transfer[low_band]))
    assert not np.isclose(abs(contour_transfer[high_band]), abs(terra_transfer[high_band]))
