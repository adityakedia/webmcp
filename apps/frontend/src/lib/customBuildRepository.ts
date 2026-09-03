import type { CustomSpeakerBuild, CustomSpeakerConfiguration } from '@acoustom/types';
import { apiUrl } from './api';
import { getNeonJwt } from './neonAuth';
import { readLocalBuilds, upsertLocalBuild, type LocalBuild } from './localBuilds';

type SavedConfiguration = {
  id: string;
  revision: number;
  name: string;
  configuration: CustomSpeakerConfiguration;
  preferences?: LocalBuild['preferences'];
};

async function headers() {
  const token = await getNeonJwt();
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : null;
}

export async function validateBuild(
  configuration: CustomSpeakerConfiguration,
  signal?: AbortSignal
) {
  const response = await fetch(apiUrl('/api/custom-speakers/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configuration),
    signal,
  });
  if (!response.ok) throw new Error('Custom build validation failed');
  return response.json() as Promise<CustomSpeakerBuild>;
}

export async function syncBuildToAccount(build: LocalBuild): Promise<LocalBuild> {
  const requestHeaders = await headers();
  if (!requestHeaders) return build;
  const endpoint = build.remoteId
    ? `/api/configurations/${encodeURIComponent(build.remoteId)}`
    : '/api/configurations/';
  const response = await fetch(apiUrl(endpoint), {
    method: build.remoteId ? 'PUT' : 'POST',
    headers: requestHeaders,
    body: JSON.stringify({
      configuration: build.configuration,
      expectedRevision: build.revision,
      actor: 'user',
      preferences: build.preferences,
    }),
  });
  if (!response.ok) throw new Error('Saving this build to your account failed');
  const saved = (await response.json()) as SavedConfiguration;
  return {
    ...build,
    remoteId: saved.id,
    revision: saved.revision,
    configuration: saved.configuration,
    name: saved.name,
    preferences: saved.preferences ?? build.preferences,
  };
}

export async function deleteBuildFromAccount(build: LocalBuild) {
  if (!build.remoteId) return;
  const requestHeaders = await headers();
  if (!requestHeaders) return;
  const response = await fetch(
    apiUrl(`/api/configurations/${encodeURIComponent(build.remoteId)}`),
    {
      method: 'DELETE',
      headers: requestHeaders,
    }
  );
  if (!response.ok) throw new Error('Deleting this build from your account failed');
}

/** Link anonymous browser builds to the signed-in account without changing their local ids. */
export async function syncAnonymousBuildsToAccount() {
  const stored = readLocalBuilds();
  if (!stored) return;
  const requestHeaders = await headers();
  if (!requestHeaders) return;
  for (const build of stored.builds) {
    const synced = await syncBuildToAccount(build);
    upsertLocalBuild(synced);
  }
}

/** Hydrate the shared local view from the account so the home page and builder stay identical. */
export async function hydrateBuildsFromAccount() {
  const requestHeaders = await headers();
  if (!requestHeaders) return;
  const response = await fetch(apiUrl('/api/configurations/'), { headers: requestHeaders });
  if (!response.ok) throw new Error('Loading saved account builds failed');
  const body = (await response.json()) as { configurations: SavedConfiguration[] };
  const stored = readLocalBuilds();
  for (const remote of body.configurations) {
    const existing = stored?.builds.find((build) => build.remoteId === remote.id);
    const validated = await validateBuild(remote.configuration);
    upsertLocalBuild({
      ...(existing ?? {
        id: globalThis.crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      remoteId: remote.id,
      revision: remote.revision,
      name: remote.name,
      preferences: remote.preferences,
      configuration: remote.configuration,
      derived: validated.derived,
      specs: validated.specs,
      updatedAt: new Date().toISOString(),
    });
  }
}
