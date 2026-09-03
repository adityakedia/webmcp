import { create } from 'zustand';

/**
 * Shared view state between the agent and the user.
 *
 * WebMCP tools write here and the visible components subscribe, so the agent and
 * the user always look at the same comparison set, reference track, and build.
 * Components also write user edits back so an agent can read what the user did.
 */

export type ComparisonSelectionSource = 'user' | 'agent';
export type ReferenceTrackRequest = {
  sampleId?: string;
  url?: string;
  label?: string;
  requestedAt: string;
};
export type MusicPreferences = {
  /** Short natural-language summary the agent derived from the user's listening habits. */
  summary?: string;
  genres?: string[];
  tracks?: Array<{ title: string; artist?: string }>;
  /** Where the agent obtained this, e.g. "spotify_playlist" or "conversation". */
  source?: string;
  capturedAt: string;
};

interface AgentViewStore {
  /** Comparison slot ids: `catalog:<productId>` or `custom:<localBuildId>`. */
  comparisonSelection: string[];
  comparisonSelectionSource: ComparisonSelectionSource;
  referenceTrackRequest: ReferenceTrackRequest | null;
  activeReferenceTrackLabel: string | null;
  /** Local build id the custom builder should open. */
  requestedCustomBuildId: string | null;
  musicPreferences: MusicPreferences | null;
  setComparisonSelection: (ids: string[], source: ComparisonSelectionSource) => void;
  requestReferenceTrack: (request: Omit<ReferenceTrackRequest, 'requestedAt'>) => void;
  setActiveReferenceTrackLabel: (label: string | null) => void;
  requestCustomBuild: (buildId: string | null) => void;
  setMusicPreferences: (preferences: Omit<MusicPreferences, 'capturedAt'> | null) => void;
}

export const MAX_COMPARISON_SLOTS = 5;

export const useAgentViewStore = create<AgentViewStore>((set) => ({
  comparisonSelection: [],
  comparisonSelectionSource: 'user',
  referenceTrackRequest: null,
  activeReferenceTrackLabel: null,
  requestedCustomBuildId: null,
  musicPreferences: null,
  setComparisonSelection: (ids, source) =>
    set({
      comparisonSelection: ids.slice(0, MAX_COMPARISON_SLOTS),
      comparisonSelectionSource: source,
    }),
  requestReferenceTrack: (request) =>
    set({ referenceTrackRequest: { ...request, requestedAt: new Date().toISOString() } }),
  setActiveReferenceTrackLabel: (activeReferenceTrackLabel) => set({ activeReferenceTrackLabel }),
  requestCustomBuild: (requestedCustomBuildId) => set({ requestedCustomBuildId }),
  setMusicPreferences: (preferences) =>
    set({
      musicPreferences: preferences
        ? { ...preferences, capturedAt: new Date().toISOString() }
        : null,
    }),
}));
