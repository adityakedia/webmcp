import { create } from 'zustand';
import type { ListenerPosition, RoomDimensions, SimulationResult, SimulationStatus, SpeakerPosition } from '@acoustom/types';

interface SimulationStore {
  selectedSpeakerId: string | null;
  roomDimensions: RoomDimensions & { presetId: string };
  speakerPositions: { left: SpeakerPosition; right: SpeakerPosition };
  listenerPosition: ListenerPosition;
  audioFile: File | null;
  simulationResult: SimulationResult | null;
  simulationStatus: SimulationStatus;
  simulationError: string | null;
  simulationRequestVersion: number;
  setSelectedSpeaker: (id: string) => void;
  setRoomDimensions: (dims: Partial<SimulationStore['roomDimensions']>) => void;
  setSpeakerPosition: (side: 'left' | 'right', pos: Partial<SimulationStore['speakerPositions']['left']>) => void;
  setListenerPosition: (pos: Partial<SimulationStore['listenerPosition']>) => void;
  setAudioFile: (file: File | null) => void;
  setSimulationState: (status: SimulationStatus, result?: SimulationResult | null, error?: string | null) => void;
  retrySimulation: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  selectedSpeakerId: null,
  roomDimensions: { width: 5, length: 4, height: 2.7, presetId: 'living_room' },
  speakerPositions: {
    left: { x: 1.2, y: 0.6, z: 0.8, rotation: 15 },
    right: { x: 3.8, y: 0.6, z: 0.8, rotation: -15 },
  },
  listenerPosition: { x: 2.5, y: 3.2, z: 1.1 },
  audioFile: null,
  simulationResult: null,
  simulationStatus: 'idle',
  simulationError: null,
  simulationRequestVersion: 0,
  setSelectedSpeaker: (id) => set({ selectedSpeakerId: id, simulationResult: null, simulationStatus: 'queued' }),
  setRoomDimensions: (dims) => set((s) => {
    const roomDimensions = { ...s.roomDimensions, ...dims };
    const fit = <T extends { x: number; y: number; z: number }>(position: T): T => ({
      ...position,
      x: Math.min(position.x, roomDimensions.width),
      y: Math.min(position.y, roomDimensions.length),
      z: Math.min(position.z, roomDimensions.height),
    });
    return {
      roomDimensions,
      speakerPositions: { left: fit(s.speakerPositions.left), right: fit(s.speakerPositions.right) },
      listenerPosition: fit(s.listenerPosition),
      simulationResult: null,
      simulationStatus: 'queued',
    };
  }),
  setSpeakerPosition: (side, pos) =>
    set((s) => ({
      speakerPositions: { ...s.speakerPositions, [side]: { ...s.speakerPositions[side], ...pos } }, simulationResult: null, simulationStatus: 'queued',
    })),
  setListenerPosition: (pos) => set((s) => ({ listenerPosition: { ...s.listenerPosition, ...pos }, simulationResult: null, simulationStatus: 'queued' })),
  setAudioFile: (file) => set({ audioFile: file }),
  setSimulationState: (simulationStatus, simulationResult, simulationError = null) => set((state) => ({
    simulationStatus,
    simulationResult: simulationResult === undefined ? state.simulationResult : simulationResult,
    simulationError,
  })),
  retrySimulation: () => set((state) => ({ simulationRequestVersion: state.simulationRequestVersion + 1 })),
}));
