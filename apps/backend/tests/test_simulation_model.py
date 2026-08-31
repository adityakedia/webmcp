import tempfile
import unittest
from pathlib import Path

import numpy as np
import pyroomacoustics as pra
from pydantic import ValidationError
from scipy.io import wavfile

from app.core.config import settings
from app.schemas.simulation import SimulationRequest
from app.services.simulation import SimulationService


class SimulationModelTest(unittest.IsolatedAsyncioTestCase):
    async def test_catalog_speaker_uses_its_own_profile_and_returns_performance_data(self):
        config = SimulationRequest.model_validate(
            {
                "speakerId": "Terra One",
                "room": {"width": 3, "length": 3, "height": 2.5},
                "speakers": [
                    {"x": 0.8, "y": 0.5, "z": 0.8},
                    {"x": 2.2, "y": 0.5, "z": 0.8},
                ],
                "listener": {"x": 1.5, "y": 2.2, "z": 1.1},
            }
        )
        with tempfile.TemporaryDirectory() as upload_dir:
            previous_upload_dir = settings.UPLOAD_DIR
            settings.UPLOAD_DIR = upload_dir
            try:
                result = await SimulationService().run(config)
            finally:
                settings.UPLOAD_DIR = previous_upload_dir

        self.assertEqual(result["speakerPerformance"]["id"], "terra_one")
        self.assertEqual(result["speakerPerformance"]["measurementStatus"], "specification_based")
        self.assertEqual(len(result["frequencyResponse"]), 31)

    def test_complete_reference_profiles_are_accepted_at_simulation_boundary(self):
        for reference_id in ("two_way_compact", "three_way_reference"):
            config = SimulationRequest.model_validate(
                {
                    "speakerId": "custom-build",
                    "speakerProfile": {"status": "reference_ready", "referenceId": reference_id},
                    "room": {"width": 3, "length": 3, "height": 2.5},
                    "speakers": [
                        {"x": 0.8, "y": 0.5, "z": 0.8},
                        {"x": 2.2, "y": 0.5, "z": 0.8},
                    ],
                    "listener": {"x": 1.5, "y": 2.2, "z": 1.1},
                }
            )
            self.assertEqual(config.speakerProfile.referenceId, reference_id)

    def test_sealed_mimir_component_model_is_accepted_at_simulation_boundary(self):
        config = SimulationRequest.model_validate(
            {
                "speakerId": "custom-build",
                "speakerProfile": {
                    "status": "component_model_ready",
                    "referenceId": "two_way_compact",
                    "modelInputs": {"alignment": "sealed", "netVolumeLitres": 14},
                },
                "room": {"width": 3, "length": 3, "height": 2.5},
                "speakers": [
                    {"x": 0.8, "y": 0.5, "z": 0.8},
                    {"x": 2.2, "y": 0.5, "z": 0.8},
                ],
                "listener": {"x": 1.5, "y": 2.2, "z": 1.1},
            }
        )
        self.assertEqual(config.speakerProfile.modelInputs.netVolumeLitres, 14)

    def test_ported_mimir_component_model_is_accepted_at_simulation_boundary(self):
        config = SimulationRequest.model_validate(
            {
                "speakerId": "custom-build",
                "speakerProfile": {
                    "status": "component_model_ready",
                    "referenceId": "two_way_compact",
                    "modelInputs": {"alignment": "ported", "netVolumeLitres": 14, "tuningHz": 35},
                },
                "room": {"width": 3, "length": 3, "height": 2.5},
                "speakers": [
                    {"x": 0.8, "y": 0.5, "z": 0.8},
                    {"x": 2.2, "y": 0.5, "z": 0.8},
                ],
                "listener": {"x": 1.5, "y": 2.2, "z": 1.1},
            }
        )
        self.assertEqual(config.speakerProfile.modelInputs.tuningHz, 35)

    def test_incomplete_reference_cannot_be_sent_to_simulator_directly(self):
        with self.assertRaisesRegex(ValidationError, "requires completed-system measurement"):
            SimulationRequest.model_validate(
                {
                    "speakerId": "test-speaker",
                    "speakerProfile": {
                        "status": "reference_ready",
                        "referenceId": "two_way_extended",
                    },
                    "room": {"width": 3, "length": 3, "height": 2.5},
                    "speakers": [
                        {"x": 0.8, "y": 0.5, "z": 0.8},
                        {"x": 2.2, "y": 0.5, "z": 0.8},
                    ],
                    "listener": {"x": 1.5, "y": 2.2, "z": 1.1},
                }
            )

    async def test_saved_rirs_are_unmodified_pyroomacoustics_outputs(self):
        config = SimulationRequest.model_validate(
            {
                "speakerId": "test-speaker",
                "room": {
                    "width": 3,
                    "length": 3,
                    "height": 2.5,
                    "presetId": "living_room",
                },
                "speakers": [
                    {"x": 0.8, "y": 0.5, "z": 0.8, "rotation": 0},
                    {"x": 2.2, "y": 0.5, "z": 0.8, "rotation": 0},
                ],
                "listener": {"x": 1.5, "y": 2.2, "z": 1.1},
            }
        )

        with tempfile.TemporaryDirectory() as upload_dir:
            previous_upload_dir = settings.UPLOAD_DIR
            settings.UPLOAD_DIR = upload_dir
            try:
                result = await SimulationService().run(config)
            finally:
                settings.UPLOAD_DIR = previous_upload_dir

            room = pra.ShoeBox(
                [3, 3, 2.5],
                fs=44100,
                max_order=8,
                materials=pra.Material(0.35),
            )
            room.add_source([0.8, 0.5, 0.8])
            room.add_source([2.2, 0.5, 0.8])
            room.add_microphone([1.5, 2.2, 1.1])
            room.compute_rir()

            for channel, expected in zip(("left", "right"), room.rir[0], strict=True):
                filename = Path(result["impulseResponses"][channel]).name
                sample_rate, actual = wavfile.read(Path(upload_dir) / filename)
                self.assertEqual(sample_rate, 44100)
                np.testing.assert_array_equal(actual, expected.astype(np.float32))


if __name__ == "__main__":
    unittest.main()
