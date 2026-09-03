import type { AcousticPlatformId } from './customSpeaker';

export interface RoomPreset {
  id: string;
  name: string;
  description: string;
  absorptionCoefficients: RoomMaterial;
}

export interface RoomMaterial {
  floor: number;
  ceiling: number;
  wallNorth: number;
  wallSouth: number;
  wallEast: number;
  wallWest: number;
}

export interface RoomDimensions {
  width: number;
  length: number;
  height: number;
  presetId?: string;
  surfaceAbsorption?: Partial<Record<'floor' | 'ceiling' | 'north' | 'south' | 'east' | 'west', number>>;
}

export interface SpeakerPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
  directivity?: 'omni' | 'cardioid';
}

export interface ListenerPosition {
  x: number;
  y: number;
  z: number;
}

export interface SimulationRequest {
  speakerId: string;
  speakerProfile?: SimulationSpeakerProfile;
  room: RoomDimensions;
  speakers: SpeakerPosition[];
  listener: ListenerPosition;
}

export interface SimulationSpeakerProfile {
  status: 'reference_ready' | 'component_model_ready';
  referenceId: AcousticPlatformId;
  modelInputs?: { alignment: 'sealed'; netVolumeLitres: number } | { alignment: 'ported'; netVolumeLitres: number; tuningHz: number };
  acousticModifiers?: { baffleStepDb: number; grilleHighFrequencyTrimDb: number; dampingLowFrequencyTrimDb: number };
}

export interface SimulationResult {
  simulationId: string;
  impulseResponses: {
    left: string;
    right: string;
  };
  metrics: {
    rt60: number;
    earlyDecayTime?: number;
    clarity?: number;
    definition?: number;
  };
  frequencyResponse: Array<{ frequencyHz: number; gainDb: number }>;
  speakerPerformance: {
    id: string;
    name: string;
    modelType: 'catalog_specification_profile' | 'custom_reference_profile';
    measurementStatus: 'specification_based' | 'measurement_backed';
    frequencyRangeHz: [number, number];
    sensitivityDb?: number;
    note: string;
  };
}

export interface AudioState {
  isPlaying: boolean;
  isSimulated: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export type SimulationStatus = 'idle' | 'queued' | 'simulating' | 'ready' | 'error';

export * from './customSpeaker';
