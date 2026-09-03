import { useCallback } from 'react';
import { useSimulationStore } from '../store/simulation';
import type { SimulationRequest, SimulationResult } from '@acoustom/types';
import { apiUrl } from '../lib/api';

export function useSimulation() {
  const { selectedSpeakerId, roomDimensions, speakerPositions, listenerPosition } =
    useSimulationStore();

  const runSimulation = useCallback(
    async (signal?: AbortSignal): Promise<SimulationResult> => {
      if (!selectedSpeakerId) throw new Error('Select a speaker before simulating.');
      const config: SimulationRequest = {
        speakerId: selectedSpeakerId,
        room: roomDimensions,
        speakers: [speakerPositions.left, speakerPositions.right],
        listener: listenerPosition,
      };
      if (selectedSpeakerId === 'custom-reference') {
        const saved = window.sessionStorage.getItem('acoustom-custom-speaker-profile');
        if (!saved) throw new Error('No custom speaker reference profile is available.');
        const profile = JSON.parse(saved) as {
          status: string;
          referenceId:
            'two_way_compact' | 'two_way_extended' | 'three_way_reference' | 'subwoofer_active';
          modelInputs?:
            | { alignment: 'sealed'; netVolumeLitres: number }
            | { alignment: 'ported'; netVolumeLitres: number; tuningHz: number };
          acousticModifiers?: {
            baffleStepDb: number;
            grilleHighFrequencyTrimDb: number;
            dampingLowFrequencyTrimDb: number;
          };
        };
        if (profile.status === 'reference_ready')
          config.speakerProfile = {
            status: 'reference_ready',
            referenceId: profile.referenceId,
            acousticModifiers: profile.acousticModifiers,
          };
        else if (profile.status === 'component_model_ready' && profile.modelInputs)
          config.speakerProfile = {
            status: 'component_model_ready',
            referenceId: profile.referenceId,
            modelInputs: profile.modelInputs,
            acousticModifiers: profile.acousticModifiers,
          };
        else
          throw new Error('The custom build profile is incomplete. Rebuild it before simulating.');
      }

      const response = await fetch(apiUrl('/api/simulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detail = body?.detail;
        const message =
          typeof detail === 'string'
            ? detail
            : detail
              ? JSON.stringify(detail)
              : `Simulation failed (${response.status})`;
        throw new Error(message);
      }
      const payload = (await response.json()) as SimulationResult & {
        metrics?: SimulationResult['metrics'] & {
          early_decay_time?: number;
          c80?: number;
          d50?: number;
        };
      };
      if (payload.metrics) {
        payload.metrics = {
          ...payload.metrics,
          earlyDecayTime: payload.metrics.earlyDecayTime ?? payload.metrics.early_decay_time,
          clarity: payload.metrics.clarity ?? payload.metrics.c80,
          definition: payload.metrics.definition ?? payload.metrics.d50,
        };
      }
      return payload;
    },
    [listenerPosition, roomDimensions, selectedSpeakerId, speakerPositions]
  );

  return { runSimulation };
}
