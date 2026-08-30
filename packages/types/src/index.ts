export interface Speaker {
  id: string;
  manufacturer: string;
  model: string;
  type: 'bookshelf' | 'floorstanding' | 'monitor' | 'soundbar' | 'portable';
  frequencyResponse?: number[];
  sensitivity?: number;
  directivity?: SpeakerDirectivity;
  imageUrl?: string;
}

export interface SpeakerDirectivity {
  horizontal: number[][];
  vertical: number[][];
}

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
}

export interface SpeakerPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export interface ListenerPosition {
  x: number;
  y: number;
  z: number;
}

export interface SimulationRequest {
  speakerId: string;
  room: RoomDimensions;
  speakers: SpeakerPosition[];
  listener: ListenerPosition;
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
}

export interface AudioState {
  isPlaying: boolean;
  isSimulated: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export type SimulationStatus = 'idle' | 'queued' | 'simulating' | 'ready' | 'error';
