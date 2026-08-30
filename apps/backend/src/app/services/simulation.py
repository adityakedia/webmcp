import asyncio
import numpy as np
import pyroomacoustics as pra
from scipy.io import wavfile
from uuid import uuid4

from app.schemas.simulation import SimulationRequest
from app.core.config import settings

class SimulationService:
    async def run(self, config: SimulationRequest) -> dict:
        """Compute source-to-listener RIRs using Pyroomacoustics' image-source model."""
        return await asyncio.to_thread(self._compute, config)

    def _compute(self, config: SimulationRequest) -> dict:
        fs = 44100

        simulation_id = f"sim_{uuid4().hex}"
        room_config = config.room
        room_dim = [room_config.width, room_config.length, room_config.height]
        absorption = {
            "reflective": 0.1,
            "living_room": 0.35,
            "absorptive": 0.65,
        }[room_config.presetId]
        room = pra.ShoeBox(room_dim, fs=fs, max_order=8, materials=pra.Material(absorption))
        for speaker in config.speakers:
            room.add_source([speaker.x, speaker.y, speaker.z])
        room.add_microphone([config.listener.x, config.listener.y, config.listener.z])

        room.compute_rir()

        # One microphone receives one impulse response per source.
        rir_left = room.rir[0][0]
        rir_right = room.rir[0][1] if len(room.rir[0]) > 1 else rir_left

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
        }

    def _save_rir(self, rir: np.ndarray, fs: int, label: str) -> str:
        path = f"{settings.UPLOAD_DIR}/rir_{label}.wav"
        wavfile.write(path, fs, rir.astype(np.float32))
        return f"/static/rir_{label}.wav"
