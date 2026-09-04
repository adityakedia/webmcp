import { useEffect, useRef } from 'react';
import type { CustomSpeakerConfiguration, SimulationResult } from '@acoustom/types';
import { apiUrl } from '../lib/api';
import { generateBuildSheet } from '../lib/buildSheet';
import { getSharedSimulatedAudio } from '../lib/simulatedAudio';
import { acoustomOverview, acoustomSkills } from '../lib/agentBriefing';
import { useSimulationStore } from '../store/simulation';
import { useAgentViewStore, MAX_COMPARISON_SLOTS } from '../store/agentView';
import { validateBuild } from '../lib/customBuildRepository';
import {
  readLocalBuilds,
  upsertLocalBuild,
  removeLocalBuild,
  createLocalBuild,
  type LocalBuild,
} from '../lib/localBuilds';

type Product = {
  id: string;
  name: string;
  type: string;
  price: string;
  tone: string;
  category: string;
  description: string;
  specs: [string, string][];
};
export type CartItem = { productName: string; quantity: number };
export type ComparisonProductNames = {
  catalogProductNames?: string[];
  customBuildIds?: string[];
};
export type NavigationDestination =
  | 'home'
  | 'catalog'
  | 'product_detail'
  | 'compare'
  | 'listening_lab'
  | 'custom_design';
export type NavigationRequest = {
  destination: NavigationDestination;
  productName?: string;
  sectionId?: string;
  productNames?: ComparisonProductNames;
  buildId?: string;
  speakerName?: string;
  trackId?: string;
};
export type NavigationResult = {
  navigated: true;
  destination: NavigationDestination;
  path: string;
  productName?: string;
  sectionId?: string;
  productNames?: ComparisonProductNames;
  buildId?: string;
  speakerName?: string;
  trackId?: string;
  userReviewHint: string;
};
type Json = Record<string, unknown>;
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Json;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: Json, client?: { signal?: AbortSignal }) => unknown | Promise<unknown>;
};
type Options = {
  products: Product[];
  getCart: () => CartItem[];
  getLiked: () => string[];
  getAccessToken: () => string | null | Promise<string | null>;
  addToCart: (name: string, quantity: number) => CartItem[];
  updateCartQuantity: (name: string, quantity: number) => CartItem[];
  removeFromCart: (name: string) => CartItem[];
  toggleLike: (name: string) => boolean;
  getNavigationContext: () => Json;
  navigate: (request: NavigationRequest) => NavigationResult;
};

const noArgs = { type: 'object', properties: {}, additionalProperties: false };
const productInput = {
  type: 'object',
  properties: {
    productName: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
      description: 'Exact or case-insensitive Acoustom product name.',
    },
  },
  required: ['productName'],
  additionalProperties: false,
};
const productNamesInput = {
  type: 'array',
  minItems: 1,
  maxItems: MAX_COMPARISON_SLOTS,
  items: { type: 'string', minLength: 1, maxLength: 128 },
};
const navigationInput: Json = {
  type: 'object',
  properties: {
    destination: {
      type: 'string',
      enum: ['home', 'catalog', 'product_detail', 'compare', 'listening_lab', 'custom_design'],
      description: 'A supported visible Acoustom destination. Never infer or construct URLs.',
    },
    productName: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
      description:
        'Required when destination is product_detail. Must be a catalog product name.',
    },
    sectionId: {
      type: 'string',
      enum: [
        'top',
        'story',
        'speakers',
        'journal',
        'support',
        'specifications',
        'comparison',
        'room',
        'simulation',
      ],
      description:
        'Optional visible section to focus after navigation when that section exists on the destination. Use get_navigation_context to discover valid sections for the current destination.',
    },
    productNames: {
      type: 'object',
      description:
        'Optional comparison selection to load in the same call. catalogProductNames and customBuildIds are kept in their respective slots.',
      properties: {
        catalogProductNames: {
          type: 'array',
          minItems: 0,
          maxItems: MAX_COMPARISON_SLOTS,
          items: { type: 'string', minLength: 1, maxLength: 128 },
        },
        customBuildIds: {
          type: 'array',
          minItems: 0,
          maxItems: MAX_COMPARISON_SLOTS,
          items: { type: 'string', minLength: 1, maxLength: 128 },
        },
      },
      additionalProperties: false,
    },
    buildId: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
      description:
        'Local build id to open in the custom design builder (destination must be custom_design).',
    },
    speakerName: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
      description:
        'Speaker to select in the listening lab (destination must be listening_lab). Use the catalog name or "custom-reference" for the active custom build.',
    },
    trackId: {
      type: 'string',
      minLength: 1,
      maxLength: 64,
      description: 'Reference track to load in the listening lab (destination listening_lab).',
    },
  },
  required: ['destination'],
  additionalProperties: false,
};
const readOnly = { readOnlyHint: true, untrustedContentHint: false };
const action = { readOnlyHint: false, untrustedContentHint: false };
// Saved designs and validated builds include text authored by the signed-in user.
// Marking it lets agent hosts apply their prompt-injection safeguards before use.
const userContentReadOnly = { readOnlyHint: true, untrustedContentHint: true };
const userContentAction = { readOnlyHint: false, untrustedContentHint: true };
const customPricing = (input: Json) => {
  const brief = (input.brief ?? {}) as Json;
  const bass = (input.bass ?? {}) as Json;
  const cabinet = (input.cabinet ?? {}) as Json;
  const personalisation = (input.personalisation ?? {}) as Json;
  const prices: Record<string, number> = {
    standmount: 0,
    floorstanding: 450,
    two_way_compact: 2400,
    two_way_extended: 3200,
    three_way_reference: 4300,
    subwoofer_active: 1400,
    ported: 160,
    sealed: 120,
    tight: 0,
    balanced: 80,
    extended: 160,
    compact: 0,
    standard: 220,
    large: 520,
    none: 0,
    magnetic_fabric: 90,
    perforated_metal: 170,
    plinth: 0,
    slim_feet: 60,
    stand: 340,
    soft_radius: 0,
    sculpted_radius: 180,
    walnut: 0,
    black_ash: 150,
    satin_white: 120,
    engraving: 120,
    pattern: 220,
    printed_panel: 350,
    decal: 160,
    custom_artwork: 500,
  };
  const line = (label: string, key: unknown) => ({
    label,
    option: String(key ?? ''),
    amountUsd: prices[String(key ?? '')] ?? 0,
  });
  const components = [
    line('Format', brief.format),
    line('Platform', input.platformId),
    line('Enclosure', bass.alignment),
    line('Bass character', bass.bassCharacter),
    line('Cabinet size', cabinet.size),
    line('Grille', cabinet.grille),
    line('Base', cabinet.base),
    line('Edge profile', cabinet.edgeProfile),
    line('Finish', cabinet.finish),
    line('Personalisation', personalisation.kind),
  ];
  return {
    currency: 'USD',
    components,
    totalUsd: components.reduce((sum, item) => sum + item.amountUsd, 0),
  };
};
const roomProperties = {
  width: { type: 'number', minimum: 2, maximum: 20, description: 'Metres.' },
  length: { type: 'number', minimum: 2, maximum: 20, description: 'Metres.' },
  height: { type: 'number', minimum: 2, maximum: 10, description: 'Metres.' },
  roomPreset: {
    type: 'string',
    enum: ['living_room', 'reflective', 'absorptive'],
    default: 'living_room',
  },
  surfaceAbsorption: {
    type: 'object',
    description:
      'Optional absorption coefficients (0 reflective to 1 absorbent) by room surface. Omit to use roomPreset.',
    properties: {
      floor: { type: 'number', minimum: 0, maximum: 1 },
      ceiling: { type: 'number', minimum: 0, maximum: 1 },
      north: { type: 'number', minimum: 0, maximum: 1 },
      south: { type: 'number', minimum: 0, maximum: 1 },
      east: { type: 'number', minimum: 0, maximum: 1 },
      west: { type: 'number', minimum: 0, maximum: 1 },
    },
    additionalProperties: false,
  },
};
const speakerPosition = {
  type: 'object',
  properties: {
    x: { type: 'number' },
    y: { type: 'number' },
    z: { type: 'number' },
    rotation: { type: 'number', default: 0 },
    directivity: {
      type: 'string',
      enum: ['omni', 'cardioid'],
      default: 'omni',
      description: 'Optional source directivity. Omit for omni.',
    },
  },
  required: ['x', 'y', 'z'],
  additionalProperties: false,
};
const listenerPosition = {
  type: 'object',
  properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
  required: ['x', 'y', 'z'],
  additionalProperties: false,
};
const roomLayoutProperties = {
  speakerPositions: {
    type: 'array',
    minItems: 2,
    maxItems: 2,
    items: speakerPosition,
    description:
      'Optional exact left/right speaker positions in metres. When omitted, Acoustom uses its default stereo layout.',
  },
  listener: {
    ...listenerPosition,
    description:
      'Optional listening position in metres. Provide with speakerPositions for a custom layout.',
  },
};
const simulationInput = {
  type: 'object',
  properties: { ...productInput.properties, ...roomProperties, ...roomLayoutProperties },
  required: ['productName', 'width', 'length', 'height'],
  additionalProperties: false,
};
const roomEstimateInput: Json = {
  type: 'object',
  additionalProperties: false,
  properties: {
    width: { type: 'number', minimum: 2, maximum: 20 },
    length: { type: 'number', minimum: 2, maximum: 20 },
    height: { type: 'number', minimum: 2, maximum: 10 },
    presetId: { type: 'string', enum: ['living_room', 'reflective', 'absorptive'] },
    speakerPositions: { type: 'array', minItems: 2, maxItems: 2, items: speakerPosition },
    listener: listenerPosition,
    assumptions: { type: 'array', items: { type: 'string', maxLength: 500 } },
    confidence: {
      type: 'object',
      properties: {
        dimensions: { type: 'string', enum: ['low', 'medium', 'high'] },
        materials: { type: 'string', enum: ['low', 'medium', 'high'] },
        layout: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      additionalProperties: false,
    },
  },
  description:
    'Best-effort room estimate derived collaboratively from a user-provided image. speakerPositions and listener are optional when only dimensions are known; Acoustom fills sensible defaults.',
};

// Mirrors CustomSpeakerConfiguration at POST /api/custom-speakers/ (camelCase API boundary).
const customBuildInput: Json = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', const: 1, default: 1 },
    name: { type: 'string', minLength: 1, maxLength: 80 },
    brief: {
      type: 'object',
      additionalProperties: false,
      properties: {
        format: { type: 'string', enum: ['standmount', 'floorstanding', 'subwoofer'] },
        soundProfile: { type: 'string', enum: ['balanced', 'reference', 'warm', 'immersive'] },
        roomSize: { type: 'string', enum: ['small', 'medium', 'large'] },
        listeningDistanceM: { type: 'number', minimum: 1.2, maximum: 6 },
      },
      required: ['format', 'soundProfile', 'roomSize', 'listeningDistanceM'],
    },
    platformId: {
      type: 'string',
      enum: ['two_way_compact', 'two_way_extended', 'three_way_reference', 'subwoofer_active'],
    },
    bass: {
      type: 'object',
      additionalProperties: false,
      properties: {
        alignment: { type: 'string', enum: ['sealed', 'ported'] },
        bassCharacter: { type: 'string', enum: ['tight', 'balanced', 'extended'] },
        tuningHz: { type: 'number', minimum: 24, maximum: 65 },
        netVolumeLitres: { type: 'number', exclusiveMinimum: 0, maximum: 250 },
        portInnerDiameterMm: { type: 'number', exclusiveMinimum: 0, maximum: 250 },
        portLengthMm: { type: 'number', exclusiveMinimum: 0, maximum: 1000 },
        dampingDescription: { type: 'string', minLength: 3, maxLength: 500 },
      },
      required: ['alignment', 'bassCharacter'],
    },
    cabinet: {
      type: 'object',
      additionalProperties: false,
      properties: {
        size: { type: 'string', enum: ['compact', 'standard', 'large'] },
        finish: {
          type: 'string',
          enum: [
            'walnut',
            'oak',
            'black_ash',
            'satin_white',
            'satin_black',
            'deep_blue',
            'custom_colour',
          ],
        },
        finishFamily: { type: 'string', enum: ['veneer', 'paint', 'premium'] },
        grille: { type: 'string', enum: ['none', 'magnetic_fabric', 'perforated_metal'] },
        base: { type: 'string', enum: ['plinth', 'slim_feet', 'stand'] },
        edgeProfile: {
          type: 'string',
          enum: ['soft_radius', 'sculpted_radius'],
          default: 'soft_radius',
        },
      },
      required: ['size', 'finish', 'finishFamily', 'grille', 'base'],
    },
    personalisation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: {
          type: 'string',
          enum: ['none', 'engraving', 'pattern', 'printed_panel', 'decal', 'custom_artwork'],
          default: 'none',
        },
        engraving: {
          type: 'object',
          additionalProperties: false,
          properties: {
            text: { type: 'string', maxLength: 32 },
            font: { type: 'string', enum: ['modern_sans', 'classic_serif'] },
            placement: { type: 'string', enum: ['rear_badge', 'side_lower'] },
          },
          required: ['text', 'font', 'placement'],
        },
        artwork: {
          type: 'object',
          additionalProperties: false,
          properties: {
            assetId: { type: 'string' },
            application: { type: 'string', enum: ['side_panel', 'rear_panel', 'grille_badge'] },
            treatment: { type: 'string', enum: ['matte_decal', 'uv_print', 'inlaid_pattern'] },
            rightsConfirmed: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['not_required', 'pending_upload', 'under_review', 'approved', 'rejected'],
            },
          },
          required: ['application', 'treatment', 'rightsConfirmed'],
        },
      },
      required: ['kind'],
    },
  },
  required: ['name', 'brief', 'platformId', 'bass', 'cabinet', 'personalisation'],
};

const referenceTracks: Array<{ id: string; name: string; detail: string; url: string }> = [
  {
    id: 'piano',
    name: 'Piano study',
    detail: 'Natural dynamics',
    url: '/wav/sample-15s.wav',
  },
  {
    id: 'voice',
    name: 'Vocal detail',
    detail: 'Midrange focus',
    url: '/wav/sample-3s.wav',
  },
  {
    id: 'electronic',
    name: 'Electronic bass',
    detail: 'Low-frequency extension',
    url: '/wav/audio-track-cy-14.mp3',
  },
  {
    id: 'ambient',
    name: 'Ambient texture',
    detail: 'Space and decay',
    url: '/wav/freesound_community-harddrive-2tb-failure-71691.mp3',
  },
  {
    id: 'keys',
    name: 'Keyboard bass',
    detail: 'Transient response',
    url: '/wav/Casio-CTK-611-Touch-Bass-C2.wav',
  },
];

// WebMCP's current standard does not register outputSchema. Keep output
// contracts discoverable here; backend references are generated by FastAPI's
// OpenAPI document, so they cannot drift from the service responses.
const responseSchemas: Record<string, Json> = {
  get_acoustom_overview: { type: 'object', required: ['site', 'pages', 'capabilities'] },
  list_acoustom_skills: {
    type: 'array',
    items: { type: 'object', required: ['name', 'description', 'whenToUse', 'tools'] },
  },
  get_acoustom_skill: {
    type: 'object',
    required: ['name', 'description', 'whenToUse', 'tools', 'instructions'],
  },
  list_webmcp_tools: {
    type: 'array',
    items: { type: 'object', required: ['name', 'title', 'annotations', 'category'] },
  },
  get_webmcp_tool_contract: {
    type: 'object',
    required: ['name', 'inputSchema', 'responseSchema'],
  },
  get_user_context: {
    type: 'object',
    required: ['path', 'page', 'comparisonSelection', 'listeningLab', 'customBuilder'],
  },
  get_acoustom_workflow: { type: 'object', required: ['version', 'agentProtocol', 'workflows'] },
  list_products: {
    type: 'array',
    items: { type: 'object', required: ['name', 'type', 'price', 'tone', 'category'] },
  },
  get_product: {
    type: 'object',
    required: ['name', 'type', 'price', 'tone', 'category', 'description', 'specs'],
  },
  recommend_speakers: { type: 'object', required: ['recommendations'] },
  compare_speakers: {
    type: 'object',
    required: ['columns'],
  },
  set_comparison_selection: {
    type: 'object',
    required: ['selection', 'selectionSource'],
  },
  get_room_simulation_presets: {
    type: 'array',
    items: { type: 'object', required: ['id', 'name', 'description'] },
  },
  list_reference_tracks: {
    type: 'array',
    items: { type: 'object', required: ['id', 'name', 'detail', 'url'] },
  },
  set_reference_track: {
    type: 'object',
    required: ['ok', 'referenceTrackRequest', 'activeReferenceTrackLabel'],
  },
  upload_reference_audio: {
    type: 'object',
    required: ['ok', 'fileName', 'mimeType', 'sizeBytes'],
  },
  set_music_preferences: {
    type: 'object',
    required: ['ok', 'musicPreferences'],
  },
  attach_room_reference_images: {
    type: 'object',
    required: ['ok', 'references', 'guidance'],
  },
  get_room_estimate_contract: { type: 'object', required: ['inputSchema', 'guidance'] },
  apply_agent_room_estimate: {
    type: 'object',
    required: ['applied', 'room', 'assumptions', 'confidence'],
  },
  get_current_room_spec: { type: 'object', required: ['room', 'speakerPositions', 'listener'] },
  get_live_simulation_result: {
    type: 'object',
    required: ['status'],
  },
  set_listening_lab_speaker: {
    type: 'object',
    required: ['ok', 'selectedSpeakerId', 'source'],
  },
  refresh_room_simulation: {
    type: 'object',
    required: ['ok', 'selectedSpeakerId'],
  },
  get_room_reference_images: { type: 'object', required: ['references', 'guidance'] },
  get_shared_simulated_audio: { type: 'object', required: ['audioUrl', 'mimeType', 'expiresAt'] },
  get_custom_speaker_builder_options: {
    $ref: '/openapi.json#/components/schemas/CustomSpeakerCatalogResponse',
  },
  validate_custom_speaker_build: {
    allOf: [
      { $ref: '/openapi.json#/components/schemas/CustomSpeakerBuild' },
      {
        type: 'object',
        required: ['pricing'],
        properties: {
          pricing: { type: 'object', required: ['currency', 'components', 'totalUsd'] },
        },
      },
    ],
  },
  generate_custom_build_sheet: {
    type: 'object',
    required: ['filename', 'mimeType', 'imageDataUrl', 'build', 'pricing'],
  },
  list_saved_custom_configurations: { type: 'object', required: ['configurations'] },
  get_saved_custom_configuration: {
    type: 'object',
    required: ['id', 'configuration', 'revision', 'pricing'],
  },
  save_custom_configuration: {
    type: 'object',
    required: ['id', 'configuration', 'revision', 'pricing'],
  },
  delete_saved_custom_configuration: {
    type: 'object',
    required: ['ok', 'deletedConfigurationId'],
  },
  list_local_builds: { type: 'object', required: ['builds', 'activeBuildId'] },
  save_local_build: { type: 'object', required: ['ok', 'buildId', 'name', 'configuration', 'derived'] },
  delete_local_build: { type: 'object', required: ['ok', 'deletedBuildId', 'deletedName'] },
  rename_local_build: { type: 'object', required: ['ok', 'buildId', 'name'] },
  get_cart: { type: 'object', required: ['items', 'itemCount'] },
  get_wishlist: { type: 'object', required: ['productNames'] },
  add_to_cart: {
    type: 'object',
    required: ['ok', 'productName', 'quantity', 'items', 'itemCount'],
  },
  update_cart_quantity: {
    type: 'object',
    required: ['ok', 'productName', 'quantity', 'items', 'itemCount'],
  },
  remove_from_cart: {
    type: 'object',
    required: ['ok', 'removedProductName', 'items', 'itemCount'],
  },
  toggle_wishlist: {
    type: 'object',
    required: ['ok', 'productName', 'currentlyLiked', 'productNames'],
  },
  get_navigation_context: {
    type: 'object',
    required: ['path', 'page', 'destinations', 'sections', 'navigationSchema'],
  },
  navigate_acoustom: {
    type: 'object',
    required: ['navigated', 'destination', 'path', 'userReviewHint'],
  },
  simulate_speaker_in_room: { $ref: '/openapi.json#/components/schemas/SimulationResponse' },
  simulate_custom_speaker_in_room: { $ref: '/openapi.json#/components/schemas/SimulationResponse' },
};

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`${name} must be a finite number.`);
  return value;
}
async function apiJson(response: Response, operation: string): Promise<unknown> {
  if (response.ok) return response.json();
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  const detail =
    typeof body?.detail === 'string'
      ? body.detail
      : body?.detail
        ? JSON.stringify(body.detail)
        : `HTTP ${response.status}`;
  throw new Error(`${operation} failed: ${detail}`);
}

const TOOL_CATEGORIES: Record<string, string> = {
  get_acoustom_overview: 'orientation',
  list_acoustom_skills: 'orientation',
  get_acoustom_skill: 'orientation',
  get_acoustom_workflow: 'orientation',
  list_webmcp_tools: 'orientation',
  get_webmcp_tool_contract: 'orientation',
  get_user_context: 'shared_view',
  get_navigation_context: 'shared_view',
  navigate_acoustom: 'shared_view',
  list_products: 'catalog',
  get_product: 'catalog',
  recommend_speakers: 'catalog',
  compare_speakers: 'comparison',
  set_comparison_selection: 'comparison',
  get_room_simulation_presets: 'room',
  get_room_estimate_contract: 'room',
  attach_room_reference_images: 'room',
  get_room_reference_images: 'room',
  apply_agent_room_estimate: 'room',
  get_current_room_spec: 'room',
  simulate_speaker_in_room: 'simulation',
  simulate_custom_speaker_in_room: 'simulation',
  set_listening_lab_speaker: 'simulation',
  refresh_room_simulation: 'simulation',
  get_live_simulation_result: 'simulation',
  list_reference_tracks: 'listening',
  set_reference_track: 'listening',
  upload_reference_audio: 'listening',
  set_music_preferences: 'listening',
  get_shared_simulated_audio: 'listening',
  get_custom_speaker_builder_options: 'custom_build',
  validate_custom_speaker_build: 'custom_build',
  generate_custom_build_sheet: 'custom_build',
  list_local_builds: 'build_library',
  save_local_build: 'build_library',
  rename_local_build: 'build_library',
  delete_local_build: 'build_library',
  list_saved_custom_configurations: 'account_designs',
  get_saved_custom_configuration: 'account_designs',
  save_custom_configuration: 'account_designs',
  delete_saved_custom_configuration: 'account_designs',
  get_cart: 'bag_and_wishlist',
  get_wishlist: 'bag_and_wishlist',
  add_to_cart: 'bag_and_wishlist',
  update_cart_quantity: 'bag_and_wishlist',
  remove_from_cart: 'bag_and_wishlist',
  toggle_wishlist: 'bag_and_wishlist',
};

/** Imperative WebMCP registration; the app remains usable when the API is unavailable. */
export function useWebMcp(options: Options): void {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  }, [options]);
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const find = (name: unknown) =>
      typeof name === 'string'
        ? latest.current.products.find((item) => item.name.toLowerCase() === name.toLowerCase())
        : undefined;
    const findCustomProfile = (buildId: string) => {
      const stored = readLocalBuilds();
      const build = stored?.builds.find((item) => item.id === buildId);
      return build?.derived?.simulationProfile ?? null;
    };
    const authenticatedHeaders = async () => {
      const token = await latest.current.getAccessToken();
      if (!token)
        throw new Error('The user must sign in before working with saved configurations.');
      return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    };
    const stereoLayout = (width: number, length: number, height: number) => ({
      speakers: [
        {
          x: width * 0.24,
          y: Math.min(0.7, length * 0.2),
          z: Math.min(1, height - 0.1),
          rotation: 15,
        },
        {
          x: width * 0.76,
          y: Math.min(0.7, length * 0.2),
          z: Math.min(1, height - 0.1),
          rotation: -15,
        },
      ],
      listener: { x: width * 0.5, y: length * 0.78, z: Math.min(1.1, height - 0.1) },
    });
    const layout = (
      width: number,
      length: number,
      height: number,
      speakerPositions: unknown,
      listener: unknown
    ) =>
      speakerPositions === undefined && listener === undefined
        ? stereoLayout(width, length, height)
        : { speakers: speakerPositions, listener };
    const tools: Tool[] = [
      {
        name: 'get_acoustom_overview',
        title: 'Get Acoustom site overview',
        description:
          'Returns what Acoustom is, what the agent can do here, what the platform deliberately does not do, the page map, and the capability-to-tool mapping. The first call for any new session.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => acoustomOverview,
      },
      {
        name: 'list_acoustom_skills',
        title: 'List Acoustom skills',
        description:
          'Returns every skill available to the agent in this session: a one-line description, when to load it, and the tool names it expects the agent to call. Use get_acoustom_skill to read the full instructions for a single skill.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () =>
          acoustomSkills.map(({ name, description, whenToUse, tools }) => ({
            name,
            description,
            whenToUse,
            tools,
          })),
      },
      {
        name: 'get_acoustom_skill',
        title: 'Get an Acoustom skill',
        description:
          'Returns the full instructions for a single Acoustom skill by name. Load a specialised skill before running a workflow it owns; load acoustom-guided-discovery for broad or combined requests.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              enum: acoustomSkills.map((skill) => skill.name),
            },
          },
          required: ['name'],
          additionalProperties: false,
        },
        annotations: readOnly,
        execute: ({ name }) => {
          const skill = acoustomSkills.find((candidate) => candidate.name === name);
          if (!skill) throw new Error(`Unknown skill: ${String(name)}`);
          return skill;
        },
      },
      {
        name: 'list_webmcp_tools',
        title: 'List registered WebMCP tools',
        description:
          'Returns every tool this WebMCP host has registered, grouped by capability. Use get_webmcp_tool_contract to inspect a single tool’s full input and response schema before calling it.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => {
          const groups: Record<string, Array<{ name: string; title: string; annotations: Json }>> = {};
          tools.forEach((tool) => {
            const category = TOOL_CATEGORIES[tool.name] ?? 'other';
            groups[category] = groups[category] ?? [];
            groups[category].push({
              name: tool.name,
              title: tool.title,
              annotations: tool.annotations,
            });
          });
          return Object.entries(groups).flatMap(([category, members]) =>
            members.map((tool) => ({ ...tool, category }))
          );
        },
      },
      {
        name: 'get_webmcp_tool_contract',
        title: 'Get a WebMCP tool contract',
        description:
          'Returns the input schema and response schema for a registered Acoustom WebMCP tool. Backend response schemas reference the live FastAPI OpenAPI document.',
        inputSchema: {
          type: 'object',
          properties: { toolName: { type: 'string', enum: Object.keys(responseSchemas) } },
          required: ['toolName'],
          additionalProperties: false,
        },
        annotations: readOnly,
        execute: ({ toolName }) => {
          if (typeof toolName !== 'string' || !responseSchemas[toolName])
            throw new Error(`Unknown WebMCP tool: ${String(toolName)}`);
          const tool = tools.find((candidate) => candidate.name === toolName);
          if (!tool) throw new Error(`Registered tool unavailable: ${toolName}`);
          return {
            name: tool.name,
            title: tool.title,
            inputSchema: tool.inputSchema,
            responseSchema: responseSchemas[toolName],
          };
        },
      },
      {
        name: 'get_user_context',
        title: 'Get the live user context',
        description:
          'Returns the live state of the user’s view: the visible page, the comparison selection, the listening lab’s selected speaker, room and current simulation, the active custom build, music preferences, and the bag. Read this first when returning to a session or before a handoff.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => {
          const nav = latest.current.getNavigationContext() as Json;
          const view = useAgentViewStore.getState();
          const sim = useSimulationStore.getState();
          return {
            ...nav,
            comparisonSelection: view.comparisonSelection,
            comparisonSelectionSource: view.comparisonSelectionSource,
            listeningLab: {
              selectedSpeakerId: sim.selectedSpeakerId,
              room: sim.roomDimensions,
              speakerPositions: [sim.speakerPositions.left, sim.speakerPositions.right],
              listener: sim.listenerPosition,
              simulationStatus: sim.simulationStatus,
              hasResult: !!sim.simulationResult,
            },
            customBuilder: {
              requestedBuildId: view.requestedCustomBuildId,
              musicPreferences: view.musicPreferences,
            },
            referenceTrack: {
              activeLabel: view.activeReferenceTrackLabel,
              requestedTrackId: view.referenceTrackRequest?.sampleId ?? null,
            },
            bag: {
              items: latest.current.getCart(),
              itemCount: latest.current.getCart().reduce((sum, item) => sum + item.quantity, 0),
              wishlist: latest.current.getLiked(),
            },
            guidance:
              'Use comparisonSelection.list to know which speakers the user is looking at. Use listeningLab.hasResult to know whether the simulation in the lab is up to date; call refresh_room_simulation or set_listening_lab_speaker if not.',
          };
        },
      },
      {
        name: 'get_acoustom_workflow',
        title: 'Get Acoustom workflow guide',
        description:
          'Returns the four objective-aligned agent workflows (recommend, compare, custom build, integrated guided discovery), their tool order, purpose, and the output fields to carry to each next step, plus same-view navigation rules. An agent without prior context should call this after get_acoustom_overview.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => ({
          version: 6,
          agentProtocol: {
            firstTurn: [
              'Use the Codex built-in/in-app browser as the shared user-visible workspace. Priority order: (1) inspect it and reuse the exact existing tab when the Acoustom URL is already loaded—never duplicate or replace it; (2) otherwise ask the user to open the Acoustom URL in the in-app browser and wait for it to load; (3) only if the user asks the agent to open it or cannot do so, open Acoustom in that same active browser. If the in-app browser is unavailable, ask the user to open it from the Codex toolbar. Do not use cloud/background, temporary, hidden, headless, or separate browser contexts. A response ends only the model turn, not the shared browser session: when waiting for user input, leave the existing Acoustom tab open on the most useful view for user review, reference, user input, or collaboration as the workflow requires—such as a speaker-detail page, comparison page, custom-build page, or Listening Lab. Never close or replace it. Resume in that same tab on the next user turn. The host controls tab lifetime, so this instruction cannot guarantee persistence if the host tears the tab down.',
              'Before ending every response, mark the existing Acoustom in-app-browser tab for handoff and leave it open on the most useful view for user review, reference, user input, or collaboration as the workflow requires. This handoff mark is mandatory whether the response asks a question, reports progress, or finishes a stage: preserve the exact shared tab, never close, replace, duplicate, or describe it as temporary. On the next turn, inspect that same handed-off tab and call get_user_context before continuing. The browser host owns tab lifetime, so this is a required agent protocol rather than a frontend-enforceable pin.',
              'Call get_user_context to see what the user’s view already holds, and get_acoustom_overview when the site or tool set is unfamiliar.',
              'For every broad buying request, load acoustom-guided-discovery before recommending or inspecting products. The first response must establish context, not announce a winner.',
              'State the requirement already known, identify only the missing inputs that materially change the answer, and either ask for them or ask explicit permission to proceed with named assumptions.',
              'For missing room or music context, proactively offer an approved connected source or upload/default fallback before asking the user to type it. Ask only one concise question for information that cannot be obtained that way and would change the recommendation; never fabricate it or silently apply a default.',
              'Use tool results as the source of truth for catalog facts, pricing, specifications, and simulation output.',
              'Keep the visible page on whatever you are working on; call navigate_acoustom with the relevant destination and context (productNames, buildId, speakerName, trackId) so the user sees the same view.',
              'Label every claim as catalog fact, suitability reason, or simulated evidence. Give one primary recommendation, one alternative with its trade-off, and name the evidence you could not obtain.',
              'When the user asks for the best speaker, compare two or three credible candidates and explain why the primary choice wins. If a curated custom build could address a stated limitation, offer it as an optional validated comparison and ask permission before building.',
            ],
            evidenceLabels: {
              catalogFact: 'Directly returned by list_products or get_product.',
              suitabilityReason: 'Derived by recommend_speakers from the stated requirements.',
              simulatedEvidence:
                'Returned by a room simulation or the listening lab and dependent on its assumptions.',
            },
            completion:
              'A recommendation is complete when the user has a primary choice, a trade-off or alternative, supporting catalog facts, and any important missing evidence or assumptions stated.',
            sameViewRule:
              'Keep the user and agent on the same visible work surface. Navigate before each major stage — comparison, builder configuration, validation result, listening-lab simulation, or reference track — then perform the stage, briefly report what changed, and continue automatically. Do not ask for confirmation between ordinary steps; navigation is not consent, and pausing is needed only for missing material input, an explicit user decision, or an irreversible action.',
            responseMode: {
              rule:
                'Use the specialised workflow response structure after completing a recommendation, comparison, custom-build, or room-simulation step. Use natural conversation for ordinary follow-ups that do not advance one of those workflows.',
              requiredClosing:
                'End every workflow response with one concrete next action or one short question, and name the visible page or control the user can review when relevant.',
            },
            contextEnrichment: {
              rule:
                'Proactively offer contextual data only when it would materially improve the active workflow. Never retrieve connected-app data without explicit approval; offer a no-data fallback and summarise only relevant derived signals.',
              room:
                'Before a decision-grade room simulation with missing room inputs, offer approved room photos or a floor plan from a relevant connected source, upload, or an editable default-room fallback. Identify candidate files for approval before using them.',
              music:
                'When listening taste would materially change a recommendation or audition, offer a high-level music-preference summary from a relevant connected service. Use it to choose a representative built-in track; never copy, upload, or simulate protected streaming audio.',
            },
          },
          workflows: [
            {
              id: 'recommend_for_user',
              purpose:
                'Recommend a small number of catalog speakers for the user’s room, taste, format, and budget, then bring the page to the chosen candidate.',
              steps: [
                {
                  tool: 'get_user_context',
                  useOutput:
                    'Use bag.wishlist, listeningLab.room, customBuilder.musicPreferences, and comparisonSelection to recognise the user’s current state without asking again.',
                },
                {
                  tool: 'recommend_speakers',
                  requiredInputs: ['roomSize', 'soundProfile'],
                  optionalInputs: ['preferredFormat', 'budgetUsd', 'feedback'],
                  useOutput:
                    'Use ranked product names and stated matching reasons. Do not call with empty requirements.',
                },
                {
                  tool: 'get_product',
                  useOutput:
                    'Use complete details and specifications for the top candidate and any serious alternative.',
                },
                {
                  tool: 'compare_speakers',
                  optional: true,
                  useOutput:
                    'When the user asks for the best option, compare two or three credible candidates and use the requirements and returned specifications to explain why the primary choice wins.',
                },
                {
                  tool: 'set_comparison_selection OR navigate_acoustom(productNames)',
                  optional: true,
                  useOutput:
                    'Put the candidates being compared into the visible comparison matrix before presenting the comparison.',
                },
                {
                  tool: 'navigate_acoustom',
                  useOutput:
                    'Show the top candidate on its product page (destination: product_detail, productName), or keep the comparison matrix visible when comparison is the active step.',
                },
              ],
              constraints: [
                'If room size, listening preference, or another material requirement is unknown, ask the user for it or get explicit permission to use named assumptions before ranking.',
                'Do not treat the ranking score as a measured acoustic result.',
                'Budget is USD per pair; use budgetUsd, not budgetEur.',
              ],
            },
            {
              id: 'compare_candidates',
              purpose:
                'Compare two to five speakers side by side in the visible comparison matrix, optionally with matched room-simulation evidence, and summarise them against the user’s stated requirements.',
              steps: [
                {
                  tool: 'get_user_context',
                  useOutput:
                    'Reuse comparisonSelection as the starting set. Use list_local_builds to discover custom build ids when including them.',
                },
                {
                  tool: 'compare_speakers',
                  optionalInputs: ['includeSimulation'],
                  useOutput:
                    'Each column is one speaker with its specifications. With includeSimulation:true the same room and source profile are used for every column.',
                },
                {
                  tool: 'set_comparison_selection OR navigate_acoustom(productNames)',
                  useOutput:
                    'Make the comparison the user is looking at. navigate_acoustom with destination: compare and productNames loads the matrix in one call; set_comparison_selection does the same without moving the page.',
                },
                {
                  tool: 'navigate_acoustom',
                  useOutput:
                    'If the user is not already on the comparison page, send them there with destination: compare and the productNames so the same columns are on screen.',
                },
                {
                  tool: 'simulate_speaker_in_room | simulate_custom_speaker_in_room',
                  optional: true,
                  useOutput:
                    'When the user wants room-specific evidence rather than a spec table, simulate each column in the same room so RT60 and frequency response are like for like.',
                },
              ],
              constraints: [
                'Do not mix simulation runs from different rooms and present the numbers as a like-for-like comparison.',
                'Prices are USD per pair. A custom build price is the configured component total from validation, not a catalog price; say so when comparing it against catalog models.',
                'A custom build only carries specifications once it has been validated; if a column is missing specs, revalidate the build before comparing.',
              ],
            },
            {
              id: 'custom_build_simulation',
              purpose:
                'Validate a curated custom speaker, generate a build sheet, simulate its returned engineering profile in the user’s room, and refine the build in response to feedback.',
              steps: [
                {
                  tool: 'get_custom_speaker_builder_options',
                  useOutput: 'Choose a server-owned platform.',
                },
                {
                  tool: 'validate_custom_speaker_build',
                  useOutput:
                    'Pass the entire returned build as build to simulate_custom_speaker_in_room, and as configuration to save_local_build / save_custom_configuration.',
                },
                {
                  tool: 'get_current_room_spec',
                  optional: true,
                  useOutput:
                    'Inspect the live listening-lab room specification, including any image-derived estimate applied by the agent or edits made by the user.',
                },
                {
                  tool: 'generate_custom_build_sheet',
                  optional: true,
                  useOutput: 'Returns a PNG data URL for the validated build sheet.',
                },
                {
                  tool: 'simulate_custom_speaker_in_room',
                  useOutput:
                    'Pass only build to simulate against the live listening-lab room specification. Supply room fields only to intentionally override it. Return impulse-response URLs and RT60.',
                },
                {
                  tool: 'save_local_build OR save_custom_configuration',
                  useOutput:
                    'save_local_build validates and stores derived specs for browser-local persistence; save_custom_configuration is for durable account-backed designs and uses optimistic revision control.',
                },
                {
                  tool: 'navigate_acoustom',
                  useOutput:
                    'Open the build for the user with destination: custom_design and buildId; follow up with destination: listening_lab to show its in-room simulation.',
                },
              ],
              constraints: [
                'If a room image estimate was applied, call get_current_room_spec or rely on the live room state; do not reconstruct its dimensions or layout from memory.',
                'State whether the simulation used live room inputs or explicit overrides.',
                'Treat personalisation as subject to design review when warnings or its status say so. Keep the builder and Listening Lab visible throughout: navigate, perform the next ordinary step, brief the user, and continue without an intermediate confirmation.',
              ],
            },
            {
              id: 'integrated_guided_discovery',
              purpose:
                'Take the user from a blank brief to an informed decision across catalog, comparison, custom build, and simulation in one session, with the visible page tracking every step.',
              steps: [
                {
                  tool: 'get_user_context + get_acoustom_overview',
                  useOutput:
                    'Recognise the existing state. Decide which skill to load (acoustom-guided-discovery is the entry point).',
                },
                {
                  tool: 'get_acoustom_skill(name: acoustom-guided-discovery)',
                  useOutput:
                    'Adopt the discovery protocol: brief, then bring outside context in, then run the work where the user can see it.',
                },
                {
                  tool: 'set_music_preferences',
                  optional: true,
                  useOutput:
                    'When the user supplied listening habits or a playlist from outside Acoustom, store the summary so the reasoning and the visible page share the same context.',
                },
                {
                  tool: 'attach_room_reference_images + apply_agent_room_estimate',
                  optional: true,
                  useOutput:
                    'Translate user-provided room photos or floor plans into editable Listening Lab dimensions, preset, and layout. State assumptions and confidence.',
                },
                {
                  tool: 'recommend_speakers + get_product',
                  useOutput: 'Shortlist the catalog.',
                },
                {
                  tool: 'set_comparison_selection + navigate_acoustom(productNames)',
                  useOutput: 'Load the shortlist into the visible comparison matrix.',
                },
                {
                  tool: 'simulate_speaker_in_room',
                  optional: true,
                  useOutput:
                    'Run the shortlist through the user’s room; mix the simulated results with the spec table only when they came from the same room.',
                },
                {
                  tool: 'validate_custom_speaker_build + save_local_build + simulate_custom_speaker_in_room',
                  optional: true,
                  useOutput:
                    'When the user wants a custom alternative, add a build to the comparison set, then simulate it in the same room and summarise why the custom build does or does not help.',
                },
                {
                  tool: 'navigate_acoustom',
                  useOutput:
                    'Keep the visible page on whichever view the user is being asked to reason about. Always include context (productNames, buildId, speakerName, trackId) so the user sees the same thing you do.',
                },
              ],
              constraints: [
                'Stage only what serves the user’s question. Skip the custom build when the catalog already fits; skip simulation when the user only wants a spec sheet.',
                'Close with a single primary recommendation, one alternative with its trade-off, the supporting evidence, and the missing evidence you could not obtain.',
                'Acoustom has no checkout, payment, or order flow. The bag and wishlist are browser-local; never describe add_to_cart or toggle_wishlist as a purchase.',
              ],
            },
            {
              id: 'shared_simulation_audio',
              purpose:
                'Return a playable, browser-rendered room-simulation WAV after the user has explicitly approved sharing their source track.',
              steps: [
                {
                  tool: 'set_reference_track | upload_reference_audio',
                  useOutput:
                    'Offer the optional choice of an Acoustom track or the user’s own uploaded track; do not require upload. Make sure the listening lab is using the chosen track.',
                },
                {
                  tool: 'simulate_speaker_in_room | simulate_custom_speaker_in_room',
                  useOutput: 'The browser uses the returned impulse responses to render its audio.',
                },
                {
                  tool: 'get_shared_simulated_audio',
                  useOutput:
                    'Returns the temporary playable WAV URL, MIME type, and expiry after the user clicks Share with agent in the listening lab.',
                },
              ],
              constraints: [
                'Never claim that an impulse-response URL is a rendered music track.',
                'If get_shared_simulated_audio reports no asset, ask the user to choose Share with agent in the listening lab.',
                'The audio URL is temporary and represents user-authorized content.',
              ],
            },
            {
              id: 'visible_navigation',
              purpose:
                'Move the visible Acoustom app to the relevant, editable context so the user can review a product, comparison, simulation, or custom design alongside the agent.',
              steps: [
                {
                  tool: 'get_user_context OR get_navigation_context',
                  useOutput:
                    'Inspect the current visible page, comparison set, lab speaker, and active build before navigating.',
                },
                {
                  tool: 'navigate_acoustom',
                  useOutput:
                    'Move the page and carry the relevant context in the same call: productNames fills the comparison matrix, speakerName selects the listening-lab speaker, buildId opens a saved build, trackId loads a reference track.',
                },
              ],
              constraints: [
                'Use navigation only when it materially helps the user review, compare, simulate, or edit work.',
                'Never construct arbitrary URLs or claim to navigate to checkout; this app has no checkout tool or purchase flow.',
                'Navigation is not user confirmation. After navigating, invite the user to review or change the visible controls.',
              ],
            },
          ],
        }),
      },
      {
        name: 'get_navigation_context',
        title: 'Get visible navigation context',
        description:
          'Returns the current visible Acoustom page, selected product where applicable, supported destinations, the user-facing sections that can be focused, the full navigation schema, and the navigation policy. Use before navigating when the current page is unknown.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => latest.current.getNavigationContext(),
      },
      {
        name: 'navigate_acoustom',
        title: 'Navigate Acoustom for user review',
        description:
          'Moves the visible Acoustom app to a supported in-app destination and can carry the relevant context in the same call: productNames fills the comparison matrix, speakerName selects the listening-lab speaker, buildId opens a saved build in the custom builder, trackId loads a reference track. Use only when showing the page materially helps collaboration. This cannot navigate to arbitrary URLs, checkout, payment, or purchase.',
        inputSchema: navigationInput,
        annotations: action,
        execute: ({
          destination,
          productName,
          sectionId,
          productNames,
          buildId,
          speakerName,
          trackId,
        }) => {
          if (
            typeof destination !== 'string' ||
            ![
              'home',
              'catalog',
              'product_detail',
              'compare',
              'listening_lab',
              'custom_design',
            ].includes(destination)
          )
            throw new Error('destination must be a supported Acoustom destination.');
          if (destination === 'product_detail' && (!productName || !find(productName)))
            throw new Error(
              'productName must name a catalog product when destination is product_detail.'
            );
          if (destination === 'custom_design' && typeof buildId === 'string') {
            const stored = readLocalBuilds();
            const exists = stored?.builds.some((item) => item.id === buildId) ?? false;
            if (!exists) throw new Error('buildId must name a local custom build.');
            useAgentViewStore.getState().requestCustomBuild(buildId);
          }
          if (destination === 'listening_lab' && typeof speakerName === 'string') {
            if (speakerName !== 'custom-reference' && !find(speakerName))
              throw new Error(
                'speakerName must be a catalog product name or "custom-reference".'
              );
            useSimulationStore.getState().setSelectedSpeaker(speakerName);
          }
          if (destination === 'compare' && productNames) {
            const { catalogProductNames = [], customBuildIds = [] } = productNames as {
              catalogProductNames?: string[];
              customBuildIds?: string[];
            };
            const ids: string[] = [];
            for (const name of catalogProductNames) {
              if (!find(name)) throw new Error(`Unknown catalog product: ${name}`);
              const product = find(name);
              if (product) ids.push(`catalog:${(product as { id: string }).id}`);
            }
            for (const buildId of customBuildIds) {
              const stored = readLocalBuilds();
              const exists = stored?.builds.some((item) => item.id === buildId) ?? false;
              if (!exists) throw new Error(`Unknown custom build id: ${buildId}`);
              ids.push(`custom:${buildId}`);
            }
            if (ids.length)
              useAgentViewStore.getState().setComparisonSelection(ids.slice(0, 5), 'agent');
          }
          if (typeof trackId === 'string') {
            const track = referenceTracks.find((candidate) => candidate.id === trackId);
            if (track)
              useAgentViewStore.getState().requestReferenceTrack({
                sampleId: track.id,
                label: track.name,
              });
          }
          return latest.current.navigate({
            destination: destination as NavigationDestination,
            ...(typeof productName === 'string' ? { productName } : {}),
            ...(typeof sectionId === 'string' ? { sectionId } : {}),
            ...(productNames
              ? { productNames: productNames as { catalogProductNames?: string[]; customBuildIds?: string[] } }
              : {}),
            ...(typeof buildId === 'string' ? { buildId } : {}),
            ...(typeof speakerName === 'string' ? { speakerName } : {}),
            ...(typeof trackId === 'string' ? { trackId } : {}),
          });
        },
      },
      {
        name: 'recommend_speakers',
        title: 'Recommend speakers',
        description:
          'Ranks catalog speakers for room size and listening preference, with optional format, budget (USD per pair), and feedback. Returns transparent matching reasons; use get_product and simulation to inspect recommendations. Room size and sound profile are required so an empty request cannot be mistaken for a meaningful recommendation.',
        inputSchema: {
          type: 'object',
          properties: {
            roomSize: { type: 'string', enum: ['small', 'medium', 'large'] },
            soundProfile: { type: 'string', enum: ['balanced', 'reference', 'warm', 'immersive'] },
            preferredFormat: { type: 'string', enum: ['standmount', 'floorstanding', 'active'] },
            budgetUsd: { type: 'number', minimum: 0, description: 'USD per pair.' },
            feedback: {
              type: 'string',
              maxLength: 2_000,
              description:
                'Optional user feedback that the chatbot should consider when explaining or refining the recommendation.',
            },
          },
          required: ['roomSize', 'soundProfile'],
          additionalProperties: false,
        },
        annotations: userContentReadOnly,
        execute: ({ roomSize, soundProfile, preferredFormat, budgetUsd, feedback }) => {
          const budget = typeof budgetUsd === 'number' ? budgetUsd : undefined;
          return {
            feedback: typeof feedback === 'string' ? feedback : undefined,
            recommendations: latest.current.products
              .map((product) => {
                const price = Number(product.price.replace(/[^0-9.]/g, ''));
                const reasons = [];
                let score = 0;
                const format = product.type.toLowerCase().includes('active')
                  ? 'active'
                  : product.type.toLowerCase().includes('floor')
                    ? 'floorstanding'
                    : 'standmount';
                const lowFrequency = product.specs.find(([label]) => label === 'Frequency response')?.[1] ?? '';
                const lowHz = Number(lowFrequency.match(/[\d.]+/)?.[0] ?? 0);
                const roomMatch = (roomSize === 'small' && format !== 'floorstanding')
                  || (roomSize === 'large' && format === 'floorstanding')
                  || roomSize === 'medium';
                if (roomMatch) {
                  score += 2;
                  reasons.push(`suited to a ${roomSize} room`);
                }
                const tone = product.tone.toLowerCase();
                const profileMatch = soundProfile === 'warm'
                  ? tone.includes('warm')
                  : soundProfile === 'reference'
                    ? tone.includes('reference') || tone.includes('studio') || tone.includes('signature')
                    : soundProfile === 'immersive'
                      ? format === 'floorstanding' || lowHz <= 35
                      : true;
                if (profileMatch) {
                  score += 2;
                  reasons.push(`matches the ${soundProfile} listening preference`);
                }
                if (format === preferredFormat) {
                  score += 1;
                  reasons.push(`matches the preferred ${preferredFormat} format`);
                }
                if (budget === undefined || price <= budget) {
                  score += 1;
                  reasons.push(
                    budget === undefined
                      ? 'no budget limit was supplied'
                      : `within the $${budget} budget`
                  );
                }
                return { productName: product.name, score, reasons, priceUsd: price };
              })
              .sort((a, b) => b.score - a.score || a.priceUsd - b.priceUsd),
          };
        },
      },
      {
        name: 'list_products',
        title: 'List speakers',
        description: 'Returns the current Acoustom catalog: name, type, price, tone, and category.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () =>
          latest.current.products.map(({ name, type, price, tone, category }) => ({
            name,
            type,
            price,
            tone,
            category,
          })),
      },
      {
        name: 'get_product',
        title: 'Get speaker details',
        description:
          'Returns complete current-page details and specifications for one catalog speaker.',
        inputSchema: productInput,
        annotations: readOnly,
        execute: ({ productName }) => {
          const product = find(productName);
          if (!product) throw new Error(`Product not found: ${String(productName)}`);
          return product;
        },
      },
      {
        name: 'compare_speakers',
        title: 'Compare speakers',
        description:
          'Returns a column-per-speaker comparison for two to five catalog speakers and/or local custom builds. Prices are USD per pair; a custom build’s price is the configured component total from validation. Pass includeSimulation:true to run every column through the current live listening-lab room and return the complete simulation result: simulation id, impulse-response URLs, RT60, early decay time, C80 clarity, D50 definition, frequency response, and speaker performance. The result depends on the room the user is currently simulating in, so call apply_agent_room_estimate or get_current_room_spec first when the room is unknown.',
        inputSchema: {
          type: 'object',
          properties: {
            productNames: productNamesInput,
            customBuildIds: {
              type: 'array',
              minItems: 0,
              maxItems: MAX_COMPARISON_SLOTS,
              items: { type: 'string', minLength: 1, maxLength: 128 },
              description:
                'Optional local custom build ids from list_local_builds. Builds that have not been validated carry empty specifications until they are revalidated.',
            },
            includeSimulation: {
              type: 'boolean',
              default: false,
              description:
                'When true, simulate every column in the current live listening-lab room and return the complete simulation data alongside the specifications.',
            },
          },
          additionalProperties: false,
        },
        annotations: readOnly,
        execute: async (
          { productNames, customBuildIds, includeSimulation = false },
          client
        ) => {
          const catalogNames = Array.isArray(productNames) ? productNames : [];
          const buildIds = Array.isArray(customBuildIds) ? customBuildIds : [];
          if (catalogNames.length + buildIds.length < 2)
            throw new Error('Provide at least two columns: catalog products, custom builds, or a mix.');
          if (catalogNames.length + buildIds.length > MAX_COMPARISON_SLOTS)
            throw new Error(`At most ${MAX_COMPARISON_SLOTS} columns are supported.`);
          const catalogColumns = catalogNames.map((name) => {
            const product = find(name);
            if (!product) throw new Error(`Product not found: ${String(name)}`);
            return {
              kind: 'catalog' as const,
              name: product.name,
              type: product.type,
              priceUsd: Number(product.price.replace(/[^0-9.]/g, '')) || 0,
              specifications: Object.fromEntries(product.specs),
            };
          });
          const buildColumns = buildIds.map((buildId) => {
            const stored = readLocalBuilds();
            const build = stored?.builds.find((item) => item.id === buildId);
            if (!build) throw new Error(`Custom build not found: ${String(buildId)}`);
            return {
              kind: 'custom' as const,
              buildId: build.id,
              name: build.name,
              type: 'Custom design',
              priceUsd:
                customPricing((build.configuration as unknown as Json) ?? {}).totalUsd,
              specifications: Object.fromEntries(build.specs ?? []),
            };
          });
          let simulations: Array<SimulationResult | null> | null = null;
          if (includeSimulation) {
            const sim = useSimulationStore.getState();
            const room = sim.roomDimensions;
            const baseBody = (column: { name: string; buildId?: string }) => {
              if (column.buildId) {
                const profile = findCustomProfile(column.buildId);
                if (!profile)
                  throw new Error(
                    `Custom build ${column.buildId} has no simulation profile. Revalidate it via validate_custom_speaker_build and save it with save_local_build.`
                  );
                return {
                  speakerId: 'custom-reference',
                  speakerProfile: profile,
                  room,
                  speakers: [sim.speakerPositions.left, sim.speakerPositions.right],
                  listener: sim.listenerPosition,
                };
              }
              return {
                speakerId: column.name,
                room,
                speakers: [sim.speakerPositions.left, sim.speakerPositions.right],
                listener: sim.listenerPosition,
              };
            };
            simulations = await Promise.all(
              [...catalogColumns, ...buildColumns].map(async (column) => {
                try {
                  const response = await fetch(apiUrl('/api/simulate'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(baseBody(column)),
                    signal: client?.signal,
                  });
                  if (!response.ok) return null;
                  const result = (await response.json()) as SimulationResult;
                  return result;
                } catch {
                  return null;
                }
              })
            );
          }
          const columns = [...catalogColumns, ...buildColumns].map((column, index) => ({
            ...column,
            simulation: simulations?.[index] ?? null,
          }));
          return {
            columns,
            room: includeSimulation ? useSimulationStore.getState().roomDimensions : null,
            note: includeSimulation
              ? 'Simulations share the live listening-lab room; values are only directly comparable when the room is identical across columns.'
              : 'Pass includeSimulation:true to gather matched in-room evidence.',
          };
        },
      },
      {
        name: 'set_comparison_selection',
        title: 'Set comparison selection',
        description:
          'Loads up to five catalog speakers and/or local custom builds into the comparison matrix without changing the visible page. Use navigate_acoustom(destination: compare, productNames) to do the same and also land on the comparison page.',
        inputSchema: {
          type: 'object',
          properties: {
            catalogProductNames: {
              type: 'array',
              minItems: 0,
              maxItems: MAX_COMPARISON_SLOTS,
              items: { type: 'string', minLength: 1, maxLength: 128 },
            },
            customBuildIds: {
              type: 'array',
              minItems: 0,
              maxItems: MAX_COMPARISON_SLOTS,
              items: { type: 'string', minLength: 1, maxLength: 128 },
            },
          },
          additionalProperties: false,
        },
        annotations: action,
        execute: ({ catalogProductNames, customBuildIds }: {
          catalogProductNames?: string[];
          customBuildIds?: string[];
        }) => {
          const catalog = Array.isArray(catalogProductNames) ? catalogProductNames : [];
          const buildIds = Array.isArray(customBuildIds) ? customBuildIds : [];
          const ids: string[] = [];
          for (const name of catalog) {
            if (!find(name)) throw new Error(`Unknown catalog product: ${name}`);
            const product = find(name);
            if (product) ids.push(`catalog:${product.id}`);
          }
          for (const buildId of buildIds) {
            const stored = readLocalBuilds();
            const exists = stored?.builds.some((item) => item.id === buildId) ?? false;
            if (!exists) throw new Error(`Unknown custom build id: ${buildId}`);
            ids.push(`custom:${buildId}`);
          }
          if (ids.length === 0) throw new Error('Provide at least one catalog product or custom build.');
          const trimmed = ids.slice(0, MAX_COMPARISON_SLOTS);
          useAgentViewStore.getState().setComparisonSelection(trimmed, 'agent');
          return { selection: trimmed, selectionSource: 'agent' as const };
        },
      },
      {
        name: 'get_room_simulation_presets',
        title: 'List room presets',
        description: 'Returns the room-acoustic presets accepted by simulate_speaker_in_room.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => [
          {
            id: 'living_room',
            name: 'Living room',
            description: 'Balanced furnishings and everyday surfaces.',
          },
          {
            id: 'reflective',
            name: 'Loft / studio',
            description: 'Harder surfaces and longer, brighter decay.',
          },
          {
            id: 'absorptive',
            name: 'Treated room',
            description: 'Soft furnishings and acoustic treatment.',
          },
        ],
      },
      {
        name: 'list_reference_tracks',
        title: 'List reference tracks',
        description:
          'Returns the reference tracks the listening lab can audition. Use set_reference_track to load one.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => referenceTracks,
      },
      {
        name: 'set_reference_track',
        title: 'Set reference track',
        description:
          'Loads a reference track into the listening lab without moving the page. The track is identified by id from list_reference_tracks. The user still needs to press play in the lab; this only chooses the track.',
        inputSchema: {
          type: 'object',
          properties: {
            trackId: { type: 'string', enum: referenceTracks.map((track) => track.id) },
          },
          required: ['trackId'],
          additionalProperties: false,
        },
        annotations: action,
        execute: ({ trackId }) => {
          const track = referenceTracks.find((candidate) => candidate.id === trackId);
          if (!track) throw new Error(`Unknown reference track: ${String(trackId)}`);
          const state = useAgentViewStore.getState();
          state.requestReferenceTrack({ sampleId: track.id, label: track.name });
          state.setActiveReferenceTrackLabel(track.name);
          return {
            ok: true,
            referenceTrackRequest: state.referenceTrackRequest,
            activeReferenceTrackLabel: state.activeReferenceTrackLabel,
          };
        },
      },
      {
        name: 'upload_reference_audio',
        title: 'Upload reference audio',
        description:
          'Loads agent-provided reference audio into the listening lab. Pass a data URL containing an audio file; the audio remains in this browser and is not uploaded to Acoustom servers.',
        inputSchema: {
          type: 'object',
          properties: {
            dataUrl: {
              type: 'string',
              description: 'A data URL such as data:audio/wav;base64,...',
              maxLength: 35_000_000,
            },
            fileName: { type: 'string', minLength: 1, maxLength: 200 },
          },
          required: ['dataUrl', 'fileName'],
          additionalProperties: false,
        },
        annotations: action,
        execute: ({ dataUrl, fileName }) => {
          if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:audio/'))
            throw new Error('dataUrl must be an audio data URL.');
          const match = dataUrl.match(/^data:(audio\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
          if (!match) throw new Error('dataUrl must contain base64-encoded audio.');
          const binary = atob(match[2].replace(/\s/g, ''));
          if (binary.length > 25 * 1024 * 1024)
            throw new Error('Reference audio must be 25 MB or smaller.');
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          const file = new File([bytes], String(fileName), { type: match[1] });
          useSimulationStore.getState().setAudioFile(file);
          useAgentViewStore.getState().setActiveReferenceTrackLabel(file.name);
          return { ok: true, fileName: file.name, mimeType: file.type, sizeBytes: file.size };
        },
      },
      {
        name: 'set_music_preferences',
        title: 'Set music preferences',
        description:
          'Stores a short summary of the user’s listening habits so the reasoning, recommendations, and visible page share the same context. Acoustom has no Spotify or playlist integration; this tool only records what the agent already knows.',
        inputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string', maxLength: 1000 },
            genres: { type: 'array', items: { type: 'string', maxLength: 64 } },
            tracks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 200 },
                  artist: { type: 'string', maxLength: 200 },
                },
                required: ['title'],
                additionalProperties: false,
              },
            },
            source: {
              type: 'string',
              maxLength: 64,
              description: 'Where the agent obtained this, e.g. "spotify_playlist" or "conversation".',
            },
          },
          required: ['summary'],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: (input) => {
          const summary = typeof input.summary === 'string' ? input.summary : undefined;
          const genres = Array.isArray(input.genres)
            ? input.genres.filter((value): value is string => typeof value === 'string')
            : undefined;
          const tracks = Array.isArray(input.tracks)
            ? input.tracks
                .map((track) => {
                  if (!track || typeof track !== 'object') return null;
                  const entry = track as Json;
                  if (typeof entry.title !== 'string') return null;
                  return {
                    title: entry.title,
                    ...(typeof entry.artist === 'string' ? { artist: entry.artist } : {}),
                  };
                })
                .filter((value): value is { title: string; artist?: string } => !!value)
            : undefined;
          const source = typeof input.source === 'string' ? input.source : undefined;
          if (!summary) throw new Error('summary is required.');
          useAgentViewStore
            .getState()
            .setMusicPreferences({ summary, genres, tracks, source });
          return {
            ok: true,
            musicPreferences: useAgentViewStore.getState().musicPreferences,
          };
        },
      },
      {
        name: 'get_room_estimate_contract',
        title: 'Get room-image estimate contract',
        description:
          'Returns the schema and collaboration guidance for translating a user-provided room image into editable simulation inputs. This tool does not analyse images itself.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => ({
          inputSchema: roomEstimateInput,
          guidance: [
            'Use a user-provided room image only when it is visible to you.',
            'Treat all image-derived dimensions as estimates and include assumptions/confidence.',
            'A known reference measurement improves scale but is optional.',
            'The user can revise the applied fields at any time.',
          ],
        }),
      },
      {
        name: 'attach_room_reference_images',
        title: 'Attach agent room reference images',
        description:
          'Pushes image URLs the agent already holds into the listening-lab room reference panel so the user can see them. Acoustom has no built-in image understanding; the estimate is the agent’s.',
        inputSchema: {
          type: 'object',
          properties: {
            images: {
              type: 'array',
              minItems: 1,
              maxItems: 6,
              items: {
                type: 'object',
                required: ['imageUrl'],
                properties: {
                  imageUrl: { type: 'string', minLength: 1, maxLength: 1024 },
                  fileName: { type: 'string', maxLength: 200 },
                  mimeType: { type: 'string', maxLength: 64 },
                },
                additionalProperties: false,
              },
            },
            guidance: {
              type: 'string',
              maxLength: 500,
              description: 'Optional one-line note shown alongside the images in the lab.',
            },
          },
          required: ['images'],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: (input) => {
          const images = Array.isArray(input.images)
            ? input.images.filter((entry): entry is Json => !!entry && typeof entry === 'object')
            : [];
          const guidance = typeof input.guidance === 'string' ? input.guidance : undefined;
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          const references = images.map((image: Json, index: number) => ({
            id: `agent-${Date.now()}-${index}`,
            imageUrl: String(image.imageUrl),
            fileName: typeof image.fileName === 'string' ? image.fileName : 'agent-image',
            mimeType: typeof image.mimeType === 'string' ? image.mimeType : 'image/jpeg',
            expiresAt,
          }));
          useSimulationStore.getState().setRoomReferenceAssets(references);
          return {
            ok: true,
            references,
            guidance:
              guidance ??
              'Image-derived dimensions are estimates. Call get_room_estimate_contract then apply_agent_room_estimate to propose dimensions, preset, and placement for the user to confirm.',
          };
        },
      },
      {
        name: 'get_room_reference_images',
        title: 'Get Listening Lab room images',
        description:
          'Returns temporary, user-approved room-image URLs uploaded in Listening Lab. Inspect every returned image before inferring an editable room estimate. If no references are returned, the user can attach images directly to the agent conversation or call attach_room_reference_images with image URLs you already hold.',
        inputSchema: noArgs,
        annotations: userContentReadOnly,
        execute: () => {
          const references = useSimulationStore.getState().roomReferenceAssets;
          return {
            references,
            guidance: references.length
              ? 'These image URLs are temporary user-approved visual inputs. Inspect them, then call get_room_estimate_contract followed by apply_agent_room_estimate.'
              : 'No Listening Lab room images are currently available. The user may attach images directly to this conversation, or call attach_room_reference_images with image URLs you already hold.',
          };
        },
      },
      {
        name: 'apply_agent_room_estimate',
        title: 'Apply agent room estimate',
        description:
          'Applies an agent’s best-effort image-based room estimate to the live browser simulation controls. speakerPositions and listener are optional; when only dimensions and a preset are known, Acoustom fills a sensible default stereo layout. The estimate is collaborative, editable, and intentionally not a hard confirmation gate.',
        inputSchema: roomEstimateInput,
        annotations: userContentAction,
        execute: (input) => {
          const width = input.width;
          const length = input.length;
          const height = input.height;
          const presetId = input.presetId;
          const speakerPositions = Array.isArray(input.speakerPositions)
            ? (input.speakerPositions as Array<Record<string, unknown>>)
            : undefined;
          const listener =
            input.listener && typeof input.listener === 'object'
              ? (input.listener as Record<string, unknown>)
              : undefined;
          const assumptions = Array.isArray(input.assumptions)
            ? input.assumptions.filter((value): value is string => typeof value === 'string')
            : [];
          const confidence =
            input.confidence && typeof input.confidence === 'object'
              ? (input.confidence as Record<string, string>)
              : {};
          if (typeof width !== 'number' || typeof length !== 'number' || typeof height !== 'number')
            throw new Error('width, length, and height must be finite numbers.');
          if (typeof presetId !== 'string') throw new Error('presetId must be a string.');
          const store = useSimulationStore.getState();
          store.setRoomDimensions({
            width: finite(width, 'width'),
            length: finite(length, 'length'),
            height: finite(height, 'height'),
            presetId: String(presetId),
          });
          const defaults = stereoLayout(width, length, height);
          const positions = (speakerPositions as Array<Record<string, unknown>> | undefined) ??
            (defaults.speakers as Array<Record<string, unknown>>);
          const target = (listener as Record<string, unknown> | undefined) ??
            (defaults.listener as Record<string, unknown>);
          store.setSpeakerPosition('left', {
            x: finite(positions[0].x, 'speakerPositions[0].x'),
            y: finite(positions[0].y, 'speakerPositions[0].y'),
            z: finite(positions[0].z, 'speakerPositions[0].z'),
            rotation: typeof positions[0].rotation === 'number' ? positions[0].rotation : 0,
          });
          store.setSpeakerPosition('right', {
            x: finite(positions[1].x, 'speakerPositions[1].x'),
            y: finite(positions[1].y, 'speakerPositions[1].y'),
            z: finite(positions[1].z, 'speakerPositions[1].z'),
            rotation: typeof positions[1].rotation === 'number' ? positions[1].rotation : 0,
          });
          store.setListenerPosition({
            x: finite(target.x, 'listener.x'),
            y: finite(target.y, 'listener.y'),
            z: finite(target.z, 'listener.z'),
          });
          return {
            applied: true,
            room: { width, length, height, presetId },
            assumptions,
            confidence,
          };
        },
      },
      {
        name: 'get_current_room_spec',
        title: 'Get live room specification',
        description:
          'Returns the room dimensions, acoustic preset, stereo speaker positions, and listener position currently used by the listening lab. Use after a room-image estimate is applied or a user edits the room, before explaining or explicitly overriding a simulation.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => {
          const store = useSimulationStore.getState();
          return {
            room: store.roomDimensions,
            speakerPositions: [store.speakerPositions.left, store.speakerPositions.right],
            listener: store.listenerPosition,
          };
        },
      },
      {
        name: 'set_listening_lab_speaker',
        title: 'Set listening-lab speaker',
        description:
          'Selects the speaker the listening lab will simulate. Pass a catalog product name, or "custom-reference" to simulate the most recently validated custom build. Use navigate_acoustom(destination: listening_lab, speakerName) to do the same and also move the page.',
        inputSchema: {
          type: 'object',
          properties: {
            speakerName: {
              type: 'string',
              minLength: 1,
              maxLength: 128,
              description: 'Catalog product name or "custom-reference".',
            },
          },
          required: ['speakerName'],
          additionalProperties: false,
        },
        annotations: action,
        execute: ({ speakerName }) => {
          if (typeof speakerName !== 'string')
            throw new Error('speakerName must be a string.');
          if (speakerName === 'custom-reference') {
            const profile = window.sessionStorage.getItem('acoustom-custom-speaker-profile');
            if (!profile)
              throw new Error(
                'No validated custom build is available. Validate one with validate_custom_speaker_build and save it with save_local_build first.'
              );
            useSimulationStore.getState().setSelectedSpeaker('custom-reference');
            return { ok: true, selectedSpeakerId: 'custom-reference', source: 'custom-build' };
          }
          if (!find(speakerName))
            throw new Error(`Unknown catalog product: ${String(speakerName)}`);
          useSimulationStore.getState().setSelectedSpeaker(speakerName);
          return { ok: true, selectedSpeakerId: speakerName, source: 'catalog' };
        },
      },
      {
        name: 'refresh_room_simulation',
        title: 'Refresh room simulation',
        description:
          'Forces the listening lab to re-run the simulation against its current room and selected speaker. The lab usually re-runs automatically; use this when the user changed controls outside the lab or you want a guaranteed fresh result.',
        inputSchema: noArgs,
        annotations: action,
        execute: () => {
          const sim = useSimulationStore.getState();
          if (!sim.selectedSpeakerId)
            throw new Error('No speaker is selected. Call set_listening_lab_speaker first.');
          sim.retrySimulation();
          return { ok: true, selectedSpeakerId: sim.selectedSpeakerId };
        },
      },
      {
        name: 'get_live_simulation_result',
        title: 'Get live simulation result',
        description:
          'Returns the simulation result the listening lab is currently displaying, including the profile provenance. Use this instead of re-running a simulation through the API when the user has not changed the room or speaker since the last run.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => {
          const sim = useSimulationStore.getState();
          if (!sim.simulationResult)
            return {
              status: sim.simulationStatus,
              error: sim.simulationError,
              guidance: 'No simulation result is available yet. Wait for the lab to finish or call refresh_room_simulation.',
            };
          return {
            status: 'ready' as const,
            result: sim.simulationResult,
          };
        },
      },
      {
        name: 'get_shared_simulated_audio',
        title: 'Get shared simulated audio',
        description:
          'Returns the playable URL for the latest browser-rendered WAV that the user explicitly shared with the agent. The URL expires automatically.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => {
          const asset = getSharedSimulatedAudio();
          if (!asset)
            throw new Error(
              'No simulated audio has been shared. Ask the user to choose Share with agent in the listening lab.'
            );
          return asset;
        },
      },
      {
        name: 'get_custom_speaker_builder_options',
        title: 'Get custom builder options',
        description:
          'Returns server-owned custom-speaker platforms. All other accepted builder values are enumerated by validate_custom_speaker_build.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: async (_input, client) =>
          apiJson(
            await fetch(apiUrl('/api/custom-speakers/catalog'), { signal: client?.signal }),
            'Loading builder options'
          ),
      },
      {
        name: 'fill_custom_builder_form',
        title: 'Fill custom builder form',
        description:
          'Fills the visible custom-design builder form on the user\'s screen with the supplied choices, exactly as if the user had clicked them. Use for the choices you gathered from conversation or a recommendation. If the user is not on the custom-design page, call navigate_acoustom(destination: "custom_design") first. The user sees and can change every value.',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'object',
              description: 'Builder choices to apply. Only the fields you pass are changed.',
              properties: {
                format: { type: 'string', enum: ['standmount', 'floorstanding', 'subwoofer'] },
                platform: {
                  type: 'string',
                  enum: ['two_way_compact', 'two_way_extended', 'three_way_reference', 'subwoofer_active'],
                },
                enclosure: { type: 'string', enum: ['ported', 'sealed'] },
                character: { type: 'string', enum: ['tight', 'balanced', 'extended'] },
                size: { type: 'string', enum: ['compact', 'standard', 'large'] },
                grille: { type: 'string', enum: ['none', 'magnetic_fabric', 'perforated_metal'] },
                base: { type: 'string', enum: ['plinth', 'slim_feet', 'stand'] },
                edge: { type: 'string', enum: ['soft_radius', 'sculpted_radius'] },
                finish: { type: 'string', enum: ['walnut', 'black_ash', 'satin_white'] },
                personalisation: {
                  type: 'string',
                  enum: ['none', 'engraving', 'pattern', 'printed_panel', 'decal', 'custom_artwork'],
                },
              },
              additionalProperties: false,
            },
            preferences: {
              type: 'object',
              description:
                'Optional brief-question answers shown on the builder\'s first step. Stored as user preferences, separate from the custom-speaker configuration spec.',
              properties: {
                soundProfile: { type: 'string', enum: ['warm', 'balanced', 'immersive'] },
                roomSize: { type: 'string', enum: ['small', 'medium', 'large'] },
              },
              additionalProperties: false,
            },
            buildName: { type: 'string', minLength: 1, maxLength: 80 },
            focusStep: {
              type: 'integer',
              minimum: 0,
              maximum: 7,
              description:
                'Optional builder step to open so the user sees the filled fields: 0 brief, 1 format, 2 platform, 3 bass, 4 cabinet, 5 finish, 6 personalisation, 7 review.',
            },
          },
          required: [],
          anyOf: [{ required: ['fields'] }, { required: ['preferences'] }],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: ({ fields, preferences, buildName, focusStep }) => {
          const fieldCount = fields && typeof fields === 'object' ? Object.keys(fields).length : 0;
          const preferenceCount =
            preferences && typeof preferences === 'object' ? Object.keys(preferences).length : 0;
          if (!fieldCount && !preferenceCount)
            throw new Error('Set at least one builder choice in fields or preferences.');
          const state = useAgentViewStore.getState();
          state.requestBuilderForm({
            fields: (fields ?? {}) as Record<string, string>,
            ...(preferenceCount ? { preferences: preferences as { soundProfile?: 'warm' | 'balanced' | 'immersive'; roomSize?: 'small' | 'medium' | 'large' } } : {}),
            ...(typeof buildName === 'string' ? { buildName } : {}),
            ...(typeof focusStep === 'number' ? { focusStep } : {}),
          });
          return {
            ok: true,
            appliedFields: Object.keys((fields ?? {}) as Record<string, string>),
            appliedPreferences: Object.keys((preferences ?? {}) as Record<string, string>),
            guidance:
              'The form is filled on screen for the user to review. The user is on the custom-design page only if you navigated there first; mention any fields you could not apply.',
          };
        },
      },
      {
        name: 'validate_custom_speaker_build',
        title: 'Validate custom speaker build',
        description:
          'Validates and derives a curated build. Returns the validated build plus the USD component pricing breakdown and total used by the custom builder. Treat pricing as an estimate; the backend remains authoritative for engineering values.',
        inputSchema: customBuildInput,
        annotations: userContentAction,
        execute: async (input, client) => {
          const build = await apiJson(
            await fetch(apiUrl('/api/custom-speakers/'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: 1, ...input } as CustomSpeakerConfiguration),
              signal: client?.signal,
            }),
            'Custom-speaker validation'
          );
          return { ...(build as Json), pricing: customPricing(input) };
        },
      },
      {
        name: 'generate_custom_build_sheet',
        title: 'Generate custom build sheet',
        description:
          'Validates a custom configuration and renders a downloadable two-angle catalog build-sheet PNG. Returns the validated build, the USD pricing estimate, and imageDataUrl, which an agent can present as an image attachment. The custom builder must be open in this browser so its 3D renderer is available.',
        inputSchema: customBuildInput,
        annotations: userContentAction,
        execute: async (input, client) => {
          const build = (await apiJson(
            await fetch(apiUrl('/api/custom-speakers/'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: 1, ...input } as CustomSpeakerConfiguration),
              signal: client?.signal,
            }),
            'Custom-speaker validation'
          )) as CustomSpeakerConfiguration & {
            derived: import('@acoustom/types').DerivedSpeakerSpecifications;
          };
          const imageDataUrl = await generateBuildSheet({
            configuration: build,
            derived: build.derived,
          });
          const filename = `acoustom-${build.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'custom-build'}-build-sheet.png`;
          return {
            filename,
            mimeType: 'image/png',
            imageDataUrl,
            build,
            pricing: customPricing(input),
          };
        },
      },
      {
        name: 'list_saved_custom_configurations',
        title: 'List saved custom designs',
        description:
          'Lists the signed-in user’s durable custom speaker designs. Use an id from this result to load or edit a shared configuration.',
        inputSchema: noArgs,
        annotations: userContentReadOnly,
        execute: async (_input, client) =>
          apiJson(
            await fetch(apiUrl('/api/configurations/'), {
              headers: await authenticatedHeaders(),
              signal: client?.signal,
            }),
            'Loading saved configurations'
          ),
      },
      {
        name: 'get_saved_custom_configuration',
        title: 'Get saved custom design',
        description:
          'Loads one saved custom-speaker configuration, its current revision, and the same USD pricing estimate shown by the custom builder.',
        inputSchema: {
          type: 'object',
          properties: { configurationId: { type: 'string', minLength: 1, maxLength: 128 } },
          required: ['configurationId'],
          additionalProperties: false,
        },
        annotations: userContentReadOnly,
        execute: async ({ configurationId }, client) => {
          const result = (await apiJson(
            await fetch(
              apiUrl(`/api/configurations/${encodeURIComponent(String(configurationId))}`),
              { headers: await authenticatedHeaders(), signal: client?.signal }
            ),
            'Loading configuration'
          )) as Json;
          return { ...result, pricing: customPricing((result.configuration ?? {}) as Json) };
        },
      },
      {
        name: 'save_custom_configuration',
        title: 'Save custom design',
        description:
          'Creates or updates a saved custom-speaker design and returns the same USD pricing estimate shown by the custom builder. For an update, pass the id and current revision returned by get_saved_custom_configuration; changes are recorded as an agent revision.',
        inputSchema: {
          type: 'object',
          properties: {
            configurationId: { type: 'string', maxLength: 128 },
            expectedRevision: { type: 'integer', minimum: 1 },
            configuration: customBuildInput,
          },
          required: ['configuration'],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: async ({ configurationId, expectedRevision, configuration }, client) => {
          const updating = typeof configurationId === 'string' && configurationId.length > 0;
          const result = (await apiJson(
            await fetch(
              apiUrl(
                updating
                  ? `/api/configurations/${encodeURIComponent(configurationId)}`
                  : '/api/configurations/'
              ),
              {
                method: updating ? 'PUT' : 'POST',
                headers: await authenticatedHeaders(),
                body: JSON.stringify({
                  configuration: { version: 1, ...(configuration as Json) },
                  expectedRevision,
                  actor: 'agent',
                }),
                signal: client?.signal,
              }
            ),
            'Saving configuration'
          )) as Json;
          return {
            ...result,
            pricing: customPricing((result.configuration ?? configuration) as Json),
          };
        },
      },
      {
        name: 'simulate_speaker_in_room',
        title: 'Simulate speaker in room',
        description:
          'Runs a speaker-specific stereo room simulation for one catalog speaker. Returns its profile provenance, in-room frequency response, impulse-response URLs, and RT60. Detailed room surfaces and cardioid sources are optional.',
        inputSchema: simulationInput,
        annotations: action,
        execute: async (
          {
            productName,
            width: rawWidth,
            length: rawLength,
            height: rawHeight,
            roomPreset = 'living_room',
            surfaceAbsorption,
            speakerPositions,
            listener,
          },
          client
        ) => {
          const product = find(productName);
          if (!product) throw new Error(`Product not found: ${String(productName)}`);
          const width = finite(rawWidth, 'width'),
            length = finite(rawLength, 'length'),
            height = finite(rawHeight, 'height');
          return apiJson(
            await fetch(apiUrl('/api/simulate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                speakerId: product.name,
                room: {
                  width,
                  length,
                  height,
                  presetId: roomPreset,
                  ...(surfaceAbsorption ? { surfaceAbsorption } : {}),
                },
                ...layout(width, length, height, speakerPositions, listener),
              }),
              signal: client?.signal,
            }),
            'Room simulation'
          );
        },
      },
      {
        name: 'simulate_custom_speaker_in_room',
        title: 'Simulate validated custom build',
        description:
          'Runs a validated custom build in the current live listening-lab room by default. Pass the returned build unchanged. Omit room fields to use the browser room dimensions, preset, stereo positions, and listener position, including a user-edited or image-derived room estimate. Supply room fields only to intentionally override those live values.',
        inputSchema: {
          type: 'object',
          properties: {
            build: {
              type: 'object',
              required: ['derived'],
              properties: { derived: { type: 'object', required: ['simulationProfile'] } },
            },
            ...roomProperties,
            ...roomLayoutProperties,
          },
          required: ['build'],
          additionalProperties: false,
        },
        annotations: action,
        execute: async (
          {
            build,
            width: rawWidth,
            length: rawLength,
            height: rawHeight,
            roomPreset,
            surfaceAbsorption,
            speakerPositions,
            listener,
          },
          client
        ) => {
          if (!build || typeof build !== 'object')
            throw new Error('build must be the object returned by validate_custom_speaker_build.');
          const profile = (build as Json).derived;
          if (
            !profile ||
            typeof profile !== 'object' ||
            !(profile as Json).simulationProfile ||
            typeof (profile as Json).simulationProfile !== 'object'
          )
            throw new Error('build.derived.simulationProfile is required.');
          const simulationProfile = (profile as Json).simulationProfile as Json;
          const status = simulationProfile.status,
            referenceId = simulationProfile.referenceId;
          if (
            (status !== 'reference_ready' && status !== 'component_model_ready') ||
            typeof referenceId !== 'string'
          )
            throw new Error('The build does not contain a simulatable speaker profile.');
          const live = useSimulationStore.getState();
          const width = finite(rawWidth ?? live.roomDimensions.width, 'width'),
            length = finite(rawLength ?? live.roomDimensions.length, 'length'),
            height = finite(rawHeight ?? live.roomDimensions.height, 'height');
          const activeSpeakerPositions = speakerPositions ?? [
            live.speakerPositions.left,
            live.speakerPositions.right,
          ];
          const activeListener = listener ?? live.listenerPosition;
          const activePreset = roomPreset ?? live.roomDimensions.presetId;
          const speakerProfile = {
            status,
            referenceId,
            ...(simulationProfile.modelInputs
              ? { modelInputs: simulationProfile.modelInputs }
              : {}),
          };
          const result = (await apiJson(
            await fetch(apiUrl('/api/simulate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                speakerId: 'custom-reference',
                speakerProfile,
                room: {
                  width,
                  length,
                  height,
                  presetId: activePreset,
                  ...(surfaceAbsorption ? { surfaceAbsorption } : {}),
                },
                speakers: activeSpeakerPositions,
                listener: activeListener,
              }),
              signal: client?.signal,
            }),
            'Custom-build room simulation'
          )) as Json;
          return {
            ...result,
            roomInput: {
              source:
                rawWidth === undefined &&
                rawLength === undefined &&
                rawHeight === undefined &&
                roomPreset === undefined &&
                speakerPositions === undefined &&
                listener === undefined
                  ? 'live_listening_lab'
                  : 'explicit_override_or_live_defaults',
              room: { width, length, height, presetId: activePreset },
              speakerPositions: activeSpeakerPositions,
              listener: activeListener,
            },
          };
        },
      },
      {
        name: 'get_cart',
        title: 'View shopping bag',
        description: 'Returns current shopping-bag items and total item count.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => {
          const items = latest.current.getCart();
          return { items, itemCount: items.reduce((total, item) => total + item.quantity, 0) };
        },
      },
      {
        name: 'get_wishlist',
        title: 'View wishlist',
        description: 'Returns names of catalog speakers currently saved in the wishlist.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => ({ productNames: latest.current.getLiked() }),
      },
      {
        name: 'add_to_cart',
        title: 'Add to bag',
        description: 'Adds one to ten pairs of a catalog speaker to the current shopping bag. The bag is browser-local; it is not a checkout or purchase.',
        inputSchema: {
          type: 'object',
          properties: {
            ...productInput.properties,
            quantity: { type: 'integer', minimum: 1, maximum: 10, default: 1 },
          },
          required: ['productName'],
          additionalProperties: false,
        },
        annotations: action,
        execute: ({ productName, quantity = 1 }) => {
          const product = find(productName);
          if (!product) throw new Error(`Product not found: ${String(productName)}`);
          if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 10)
            throw new Error('quantity must be an integer from 1 to 10.');
          const items = latest.current.addToCart(product.name, quantity as number);
          return {
            ok: true,
            productName: product.name,
            quantity,
            items,
            itemCount: items.reduce((total, item) => total + item.quantity, 0),
          };
        },
      },
      {
        name: 'update_cart_quantity',
        title: 'Update bag quantity',
        description: 'Sets a speaker quantity in the current bag; use zero to remove it. The bag is browser-local.',
        inputSchema: {
          type: 'object',
          properties: {
            ...productInput.properties,
            quantity: { type: 'integer', minimum: 0, maximum: 10 },
          },
          required: ['productName', 'quantity'],
          additionalProperties: false,
        },
        annotations: action,
        execute: ({ productName, quantity }) => {
          const product = find(productName);
          if (!product) throw new Error(`Product not found: ${String(productName)}`);
          if (!Number.isInteger(quantity) || (quantity as number) < 0 || (quantity as number) > 10)
            throw new Error('quantity must be an integer from 0 to 10.');
          const items = latest.current.updateCartQuantity(product.name, quantity as number);
          return {
            ok: true,
            productName: product.name,
            quantity,
            items,
            itemCount: items.reduce((total, item) => total + item.quantity, 0),
          };
        },
      },
      {
        name: 'remove_from_cart',
        title: 'Remove from bag',
        description: 'Removes a catalog speaker completely from the current shopping bag. The bag is browser-local.',
        inputSchema: productInput,
        annotations: action,
        execute: ({ productName }) => {
          const product = find(productName);
          if (!product) throw new Error(`Product not found: ${String(productName)}`);
          const items = latest.current.removeFromCart(product.name);
          return {
            ok: true,
            removedProductName: product.name,
            items,
            itemCount: items.reduce((total, item) => total + item.quantity, 0),
          };
        },
      },
      {
        name: 'toggle_wishlist',
        title: 'Toggle wishlist',
        description: 'Saves a catalog speaker to the wishlist, or removes it if already saved. The wishlist is browser-local.',
        inputSchema: productInput,
        annotations: action,
        execute: ({ productName }) => {
          const product = find(productName);
          if (!product) throw new Error(`Product not found: ${String(productName)}`);
          const currentlyLiked = latest.current.toggleLike(product.name);
          return {
            ok: true,
            productName: product.name,
            currentlyLiked,
            productNames: latest.current.getLiked(),
          };
        },
      },
      {
        name: 'delete_saved_custom_configuration',
        title: 'Delete saved custom design',
        description:
          "Permanently deletes a saved custom-speaker configuration from the signed-in user's account. Use a configurationId from list_saved_custom_configurations.",
        inputSchema: {
          type: 'object',
          properties: { configurationId: { type: 'string', minLength: 1, maxLength: 128 } },
          required: ['configurationId'],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: async ({ configurationId }, client) => {
          const response = await fetch(
            apiUrl(`/api/configurations/${encodeURIComponent(String(configurationId))}`),
            { method: 'DELETE', headers: await authenticatedHeaders(), signal: client?.signal }
          );
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
            const detail =
              typeof body?.detail === 'string'
                ? body.detail
                : body?.detail
                  ? JSON.stringify(body.detail)
                  : `HTTP ${response.status}`;
            throw new Error(`Deleting configuration failed: ${detail}`);
          }
          return { ok: true, deletedConfigurationId: String(configurationId) };
        },
      },
      {
        name: 'list_local_builds',
        title: 'List local custom builds',
        description:
          "Lists custom speaker builds saved in this browser's local storage. Available without signing in. Each build stores the full spec data and the validated engineering profile so it can be simulated and compared.",
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => {
          const stored = readLocalBuilds();
          return {
            builds: (stored?.builds ?? []).map((b: LocalBuild) => ({
              id: b.id,
              name: b.name,
              remoteId: b.remoteId,
              revision: b.revision,
              createdAt: b.createdAt,
              updatedAt: b.updatedAt,
              configuration: b.configuration,
              derived: b.derived,
              specs: b.specs,
              hasSimulationProfile: !!b.derived?.simulationProfile,
            })),
            activeBuildId: stored?.activeBuildId ?? '',
          };
        },
      },
      {
        name: 'save_local_build',
        title: 'Save local custom build',
        description:
          "Creates or updates a custom speaker build in this browser's local storage without requiring sign-in. Validates the configuration against the server and persists the derived engineering profile so the build can be simulated and compared. If buildId is provided, updates that build; otherwise creates a new one. The configuration follows the same schema as validate_custom_speaker_build.",
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'string',
              maxLength: 128,
              description: 'Existing build ID to update. Omit to create a new build.',
            },
            name: { type: 'string', minLength: 1, maxLength: 80 },
            configuration: customBuildInput,
            setAsActive: {
              type: 'boolean',
              default: true,
              description:
                'When true (default), mark the build as active so the listening lab uses it. The build is also written to session storage as the live custom-reference profile.',
            },
          },
          required: ['name', 'configuration'],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: async ({ buildId, name, configuration, setAsActive = true }) => {
          const stored = readLocalBuilds();
          const builds = stored?.builds ?? [];
          if (!buildId && builds.length >= 20)
            throw new Error(
              'The browser build limit of 20 has been reached. Delete a build before creating a new one.'
            );
          const existing =
            typeof buildId === 'string' && buildId.length > 0
              ? builds.find((b) => b.id === buildId)
              : undefined;
          const baseConfig = {
            version: 1,
            ...(configuration as Record<string, unknown>),
            name: String(name),
          } as CustomSpeakerConfiguration;
          const validated = await validateBuild(baseConfig);
          const build = existing ?? createLocalBuild(baseConfig, String(name));
          const updated: LocalBuild = {
            ...build,
            name: String(name),
            configuration: baseConfig,
            derived: validated.derived,
            specs: validated.specs,
            updatedAt: new Date().toISOString(),
          };
          upsertLocalBuild(updated);
          if (setAsActive) {
            window.sessionStorage.setItem(
              'acoustom-custom-speaker-profile',
              JSON.stringify(validated.derived.simulationProfile)
            );
            useSimulationStore.getState().setSelectedSpeaker('custom-reference');
          }
          return {
            ok: true,
            buildId: updated.id,
            name: updated.name,
            configuration: updated.configuration,
            derived: updated.derived,
            specs: updated.specs,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            setAsActive,
          };
        },
      },
      {
        name: 'delete_local_build',
        title: 'Delete local custom build',
        description:
          "Deletes a custom speaker build from this browser's local storage. Does not require sign-in. If the build has been synced to an account, it remains on the server.",
        inputSchema: {
          type: 'object',
          properties: { buildId: { type: 'string', minLength: 1, maxLength: 128 } },
          required: ['buildId'],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: ({ buildId }) => {
          const stored = readLocalBuilds();
          if (!stored) throw new Error('No local builds found.');
          const build = stored.builds.find((b) => b.id === String(buildId));
          if (!build) throw new Error(`Local build not found: ${String(buildId)}`);
          removeLocalBuild(String(buildId));
          return { ok: true, deletedBuildId: String(buildId), deletedName: build.name };
        },
      },
      {
        name: 'rename_local_build',
        title: 'Rename local custom build',
        description:
          "Renames a custom speaker build in this browser's local storage without requiring sign-in.",
        inputSchema: {
          type: 'object',
          properties: {
            buildId: { type: 'string', minLength: 1, maxLength: 128 },
            name: { type: 'string', minLength: 1, maxLength: 80 },
          },
          required: ['buildId', 'name'],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: ({ buildId, name }) => {
          const stored = readLocalBuilds();
          if (!stored) throw new Error('No local builds found.');
          const build = stored.builds.find((b) => b.id === String(buildId));
          if (!build) throw new Error(`Local build not found: ${String(buildId)}`);
          upsertLocalBuild({
            ...build,
            name: String(name),
            configuration: { ...build.configuration, name: String(name) },
            updatedAt: new Date().toISOString(),
          });
          return { ok: true, buildId: String(buildId), name: String(name) };
        },
      },
    ];
    void Promise.all(
      tools.map((tool) => context.registerTool(tool, { signal: controller.signal }))
    ).catch((error: unknown) => {
      if (!controller.signal.aborted) console.warn('[WebMCP] registration failed', error);
    });
    return () => controller.abort();
  }, []);
}
