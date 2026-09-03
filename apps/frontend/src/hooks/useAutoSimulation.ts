import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulation';
import { useSimulation } from './useSimulation';

const DEBOUNCE_MS = 400;

export function useAutoSimulation() {
  const { runSimulation } = useSimulation();
  const requestSequence = useRef(0);
  const selectedSpeakerId = useSimulationStore((state) => state.selectedSpeakerId);
  const roomDimensions = useSimulationStore((state) => state.roomDimensions);
  const speakerPositions = useSimulationStore((state) => state.speakerPositions);
  const listenerPosition = useSimulationStore((state) => state.listenerPosition);
  const simulationRequestVersion = useSimulationStore((state) => state.simulationRequestVersion);
  const setSimulationState = useSimulationStore((state) => state.setSimulationState);

  useEffect(() => {
    if (!selectedSpeakerId) return;
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    setSimulationState('queued', null);
    const timer = window.setTimeout(async () => {
      setSimulationState('simulating', null);
      try {
        const result = await runSimulation(controller.signal);
        if (sequence === requestSequence.current) setSimulationState('ready', result);
      } catch (error) {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setSimulationState(
          'error',
          null,
          error instanceof Error ? error.message : 'Room simulation failed.'
        );
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    listenerPosition,
    roomDimensions,
    runSimulation,
    selectedSpeakerId,
    setSimulationState,
    simulationRequestVersion,
    speakerPositions,
  ]);
}
