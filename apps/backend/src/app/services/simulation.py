import asyncio
from uuid import uuid4

import numpy as np
import pyroomacoustics as pra
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

from app.core.config import settings
from app.schemas.simulation import SimulationRequest
from app.services.component_transfer import (
    apply_aphel_transfer,
    apply_mimir_ported_box_transfer,
    apply_mimir_sealed_box_transfer,
    apply_mimir_transfer,
    apply_seas_403_transfer,
)
from app.services.catalog_profiles import CatalogSpeakerProfile, apply_catalog_transfer
from app.services.custom_speaker_catalog import REFERENCE_SYSTEMS


class SimulationService:
    async def run(self, config: SimulationRequest, catalog_profile: CatalogSpeakerProfile | None = None) -> dict:
        """Compute source-to-listener RIRs using Pyroomacoustics' image-source model."""
        return await asyncio.to_thread(self._compute, config, catalog_profile)

    def _compute(self, config: SimulationRequest, catalog_profile: CatalogSpeakerProfile | None) -> dict:
        fs = 44100

        simulation_id = f"sim_{uuid4().hex}"
        room_config = config.room
        room_dim = [room_config.width, room_config.length, room_config.height]
        absorption = {
            "reflective": 0.1,
            "living_room": 0.35,
            "absorptive": 0.65,
        }[room_config.presetId]
        if room_config.surfaceAbsorption:
            supplied = room_config.surfaceAbsorption.model_dump(exclude_none=True)
            materials = pra.make_materials(
                **{surface: supplied.get(surface, absorption) for surface in ("west", "east", "south", "north", "floor", "ceiling")}
            )
        else:
            materials = pra.Material(absorption)
        room = pra.ShoeBox(room_dim, fs=fs, max_order=8, materials=materials)
        for speaker in config.speakers:
            directivity = None
            if speaker.directivity == "cardioid":
                directivity = pra.CardioidFamily(
                    pra.DirectionVector(speaker.rotation, degrees=True), 0.5
                )
            room.add_source([speaker.x, speaker.y, speaker.z], directivity=directivity)
        room.add_microphone([config.listener.x, config.listener.y, config.listener.z])

        room.compute_rir()

        # One microphone receives one impulse response per source.
        rir_left = room.rir[0][0]
        rir_right = room.rir[0][1] if len(room.rir[0]) > 1 else rir_left
        performance = None
        if config.speakerProfile:
            performance = {
                "id": config.speakerProfile.referenceId,
                "name": REFERENCE_SYSTEMS[config.speakerProfile.referenceId]["name"],
                "modelType": "custom_reference_profile",
                "measurementStatus": "measurement_backed",
                "frequencyRangeHz": REFERENCE_SYSTEMS[config.speakerProfile.referenceId]["frequency_range_hz"],
                "sensitivityDb": REFERENCE_SYSTEMS[config.speakerProfile.referenceId]["sensitivity_db"],
                "note": "Uses the selected custom reference or component model.",
            }
            if config.speakerProfile.status == "component_model_ready":
                model_inputs = config.speakerProfile.modelInputs
                if config.speakerProfile.referenceId == "two_way_compact" and model_inputs.alignment == "sealed":
                    rir_left = apply_mimir_sealed_box_transfer(
                        rir_left, fs, model_inputs.netVolumeLitres
                    )
                    rir_right = apply_mimir_sealed_box_transfer(
                        rir_right, fs, model_inputs.netVolumeLitres
                    )
                elif config.speakerProfile.referenceId == "two_way_compact":
                    rir_left = apply_mimir_ported_box_transfer(rir_left, fs, model_inputs.tuningHz)
                    rir_right = apply_mimir_ported_box_transfer(
                        rir_right, fs, model_inputs.tuningHz
                    )
                elif config.speakerProfile.referenceId == "two_way_extended":
                    rir_left = apply_aphel_transfer(rir_left, fs)
                    rir_right = apply_aphel_transfer(rir_right, fs)
                elif config.speakerProfile.referenceId == "three_way_reference":
                    rir_left = apply_seas_403_transfer(rir_left, fs)
                    rir_right = apply_seas_403_transfer(rir_right, fs)
                else:
                    reference = REFERENCE_SYSTEMS[config.speakerProfile.referenceId]
                    rir_left = self._apply_speaker_bandwidth(
                        rir_left, fs, reference["frequency_range_hz"]
                    )
                    rir_right = self._apply_speaker_bandwidth(
                        rir_right, fs, reference["frequency_range_hz"]
                    )
            elif config.speakerProfile.referenceId == "two_way_compact":
                rir_left = apply_mimir_transfer(rir_left, fs)
                rir_right = apply_mimir_transfer(rir_right, fs)
            elif config.speakerProfile.referenceId == "two_way_extended":
                rir_left = apply_aphel_transfer(rir_left, fs)
                rir_right = apply_aphel_transfer(rir_right, fs)
            elif config.speakerProfile.referenceId == "three_way_reference":
                rir_left = apply_seas_403_transfer(rir_left, fs)
                rir_right = apply_seas_403_transfer(rir_right, fs)
            else:
                reference = REFERENCE_SYSTEMS[config.speakerProfile.referenceId]
                frequency_range = reference["frequency_range_hz"]
                rir_left = self._apply_speaker_bandwidth(rir_left, fs, frequency_range)
                rir_right = self._apply_speaker_bandwidth(rir_right, fs, frequency_range)
        elif catalog_profile:
            rir_left = apply_catalog_transfer(rir_left, fs, catalog_profile)
            rir_right = apply_catalog_transfer(rir_right, fs, catalog_profile)
            performance = {
                "id": catalog_profile.id,
                "name": catalog_profile.name,
                "modelType": "catalog_specification_profile",
                "measurementStatus": "specification_based",
                "frequencyRangeHz": (catalog_profile.low_frequency_hz, catalog_profile.high_frequency_hz),
                "sensitivityDb": catalog_profile.sensitivity_db,
                "note": "Profiled from published bandwidth, sensitivity and voicing; not a completed-system measurement.",
            }
        else:
            performance = {
                "id": "unprofiled",
                "name": config.speakerId,
                "modelType": "catalog_specification_profile",
                "measurementStatus": "specification_based",
                "frequencyRangeHz": (20.0, fs / 2),
                "sensitivityDb": None,
                "note": "No catalog profile is available; this is a room-only response.",
            }

        left_path = self._save_rir(rir_left, fs, f"{simulation_id}_left")
        right_path = self._save_rir(rir_right, fs, f"{simulation_id}_right")

        return {
            "simulationId": simulation_id,
            "impulseResponses": {
                "left": left_path,
                "right": right_path,
            },
            "metrics": {
                "rt60": float(np.mean(pra.experimental.measure_rt60(rir_left, fs=fs))),
            },
            "frequencyResponse": self._frequency_response(rir_left, fs),
            "speakerPerformance": performance,
        }

    def _frequency_response(self, rir: np.ndarray, sample_rate: int) -> list[dict]:
        """Return a compact, normalized in-room response for agent comparison."""
        size = max(8192, 1 << (len(rir) - 1).bit_length())
        frequencies = np.fft.rfftfreq(size, 1 / sample_rate)
        magnitude = np.abs(np.fft.rfft(rir, n=size))
        reference = np.median(magnitude[(frequencies >= 500) & (frequencies <= 1000)])
        gains = 20 * np.log10(np.maximum(magnitude, 1e-12) / max(reference, 1e-12))
        points = np.geomspace(20, min(20_000, sample_rate / 2 * 0.99), 31)
        return [
            {"frequencyHz": round(float(frequency), 2), "gainDb": round(float(np.interp(frequency, frequencies, gains)), 2)}
            for frequency in points
        ]

    def _apply_speaker_bandwidth(
        self, rir: np.ndarray, fs: int, frequency_range: tuple[float, float]
    ) -> np.ndarray:
        """Apply only the published operating-band limits of a reference profile.

        This is deliberately not presented as a full loudspeaker transfer function:
        that requires measured FRD/ZMA and directivity files for the completed build.
        """
        low, high = frequency_range
        nyquist = fs / 2
        if low > 20:
            rir = sosfilt(butter(2, low / nyquist, btype="highpass", output="sos"), rir)
        if high < nyquist:
            rir = sosfilt(butter(2, high / nyquist, btype="lowpass", output="sos"), rir)
        return rir

    def _save_rir(self, rir: np.ndarray, fs: int, label: str) -> str:
        path = f"{settings.UPLOAD_DIR}/rir_{label}.wav"
        wavfile.write(path, fs, rir.astype(np.float32))
        return f"/static/rir_{label}.wav"
