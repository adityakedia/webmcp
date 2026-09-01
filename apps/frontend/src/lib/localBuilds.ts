import type { CustomSpeakerBuild, CustomSpeakerConfiguration } from '@acoustom/types';

const STORAGE_KEY = 'acoustom-local-builds-v1';
const MAX_BUILDS = 20;

export type LocalBuild = {
  id: string;
  name: string;
  configuration: CustomSpeakerConfiguration;
  simulationProfile?: CustomSpeakerBuild['derived']['simulationProfile'];
  createdAt: string;
  updatedAt: string;
};

type StoredBuilds = { activeBuildId: string; builds: LocalBuild[] };

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `build-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();

export function readLocalBuilds(): StoredBuilds | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as StoredBuilds : null;
    return parsed && Array.isArray(parsed.builds) && parsed.builds.length ? parsed : null;
  } catch { return null; }
}

export function writeLocalBuilds(value: StoredBuilds) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, builds: value.builds.slice(-MAX_BUILDS) }));
}

export function createLocalBuild(configuration: CustomSpeakerConfiguration, name = configuration.name): LocalBuild {
  const timestamp = now();
  return { id: makeId(), name, configuration: { ...configuration, name }, createdAt: timestamp, updatedAt: timestamp };
}
