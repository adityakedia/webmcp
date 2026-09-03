import type { CustomSpeakerBuild, CustomSpeakerConfiguration } from '@acoustom/types';

const STORAGE_KEY = 'acoustom-local-builds-v1';
export const MAX_LOCAL_BUILDS = 20;

export type LocalBuild = {
  id: string;
  remoteId?: string;
  revision?: number;
  name: string;
  configuration: CustomSpeakerConfiguration;
  derived?: CustomSpeakerBuild['derived'];
  specs?: [string, string][];
  createdAt: string;
  updatedAt: string;
};

export type StoredBuilds = { activeBuildId: string; builds: LocalBuild[] };

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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, builds: value.builds.slice(-MAX_LOCAL_BUILDS) }));
  window.dispatchEvent(new Event('acoustom-builds-updated'));
}

export function createLocalBuild(configuration: CustomSpeakerConfiguration, name = configuration.name): LocalBuild {
  const timestamp = now();
  return { id: makeId(), name, configuration: { ...configuration, name }, createdAt: timestamp, updatedAt: timestamp };
}

export function upsertLocalBuild(build: LocalBuild) {
  const stored = readLocalBuilds();
  const builds = stored?.builds ?? [];
  writeLocalBuilds({ activeBuildId: build.id, builds: [...builds.filter((item) => item.id !== build.id), build] });
}

export function removeLocalBuild(id: string) {
  const stored = readLocalBuilds();
  if (!stored) return;
  const builds = stored.builds.filter((item) => item.id !== id);
  writeLocalBuilds({ activeBuildId: builds[0]?.id ?? '', builds });
}

export function renameLocalBuild(id: string, name: string) {
  const stored = readLocalBuilds();
  if (!stored) return;
  const build = stored.builds.find((item) => item.id === id);
  if (!build) return;
  upsertLocalBuild({ ...build, name, configuration: { ...build.configuration, name }, updatedAt: now() });
}
