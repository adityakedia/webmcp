import { useSimulationStore } from '../store/simulation';
import type { SimulationRequest, SimulationResult } from '@acoustom/types';

export function useSimulation() {
  const { selectedSpeakerId, roomDimensions, speakerPositions, listenerPosition } = useSimulationStore();

  async function runSimulation(signal?: AbortSignal): Promise<SimulationResult> {
    if (!selectedSpeakerId) throw new Error('Select a speaker before simulating.');
    const config: SimulationRequest = {
      speakerId: selectedSpeakerId,
      room: roomDimensions,
      speakers: [speakerPositions.left, speakerPositions.right],
      listener: listenerPosition,
    };

    const response = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = body?.detail;
      const message = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `Simulation failed (${response.status})`;
      throw new Error(message);
    }
    return response.json() as Promise<SimulationResult>;
  }

  return { runSimulation };
}
