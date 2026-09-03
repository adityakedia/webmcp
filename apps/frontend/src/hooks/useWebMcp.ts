import { useEffect, useRef } from 'react';
import type { CustomSpeakerConfiguration } from '@acoustom/types';
import { apiUrl } from '../lib/api';
import { generateBuildSheet } from '../lib/buildSheet';
import { getSharedSimulatedAudio } from '../lib/simulatedAudio';
import { useSimulationStore } from '../store/simulation';
import {
  readLocalBuilds,
  upsertLocalBuild,
  removeLocalBuild,
  createLocalBuild,
  type LocalBuild,
} from '../lib/localBuilds';

type Product = {
  name: string;
  type: string;
  price: string;
  tone: string;
  category: string;
  description: string;
  specs: [string, string][];
};
export type CartItem = { productName: string; quantity: number };
export type NavigationDestination =
  'home' | 'catalog' | 'product_detail' | 'compare' | 'listening_lab' | 'custom_design';
export type NavigationRequest = {
  destination: NavigationDestination;
  productName?: string;
  sectionId?: string;
};
export type NavigationResult = {
  navigated: true;
  destination: NavigationDestination;
  path: string;
  productName?: string;
  sectionId?: string;
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
        'Required only when destination is product_detail. Must be a catalog product name.',
    },
    sectionId: {
      type: 'string',
      enum: ['top', 'story', 'speakers', 'journal', 'support', 'specifications', 'comparison'],
      description:
        'Optional visible section to focus after navigation when that section exists on the destination. Use get_navigation_context to discover valid sections for the current destination.',
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
  required: ['width', 'length', 'height', 'presetId', 'speakerPositions', 'listener'],
  description:
    'Best-effort room estimate derived collaboratively from a user-provided image. These values are editable and do not claim physical measurement precision.',
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

// WebMCP's current standard does not register outputSchema. Keep output
// contracts discoverable here; backend references are generated by FastAPI's
// OpenAPI document, so they cannot drift from the service responses.
const responseSchemas: Record<string, Json> = {
  list_products: {
    type: 'array',
    items: { type: 'object', required: ['name', 'type', 'price', 'tone', 'category'] },
  },
  get_product: {
    type: 'object',
    required: ['name', 'type', 'price', 'tone', 'category', 'description', 'specs'],
  },
  compare_speakers: {
    type: 'array',
    items: { type: 'object', required: ['name', 'type', 'price', 'specifications'] },
  },
  get_room_simulation_presets: {
    type: 'array',
    items: { type: 'object', required: ['id', 'name', 'description'] },
  },
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
  get_shared_simulated_audio: { type: 'object', required: ['audioUrl', 'mimeType', 'expiresAt'] },
  get_room_reference_images: { type: 'object', required: ['references', 'guidance'] },
  get_room_estimate_contract: { type: 'object', required: ['inputSchema', 'guidance'] },
  apply_agent_room_estimate: {
    type: 'object',
    required: ['applied', 'room', 'assumptions', 'confidence'],
  },
  get_current_room_spec: { type: 'object', required: ['room', 'speakerPositions', 'listener'] },
  simulate_speaker_in_room: { $ref: '/openapi.json#/components/schemas/SimulationResponse' },
  simulate_custom_speaker_in_room: { $ref: '/openapi.json#/components/schemas/SimulationResponse' },
  get_acoustom_workflow: { type: 'object', required: ['version', 'agentProtocol', 'workflows'] },
  recommend_speakers: { type: 'object', required: ['recommendations'] },
  list_saved_custom_configurations: { type: 'object', required: ['configurations'] },
  get_saved_custom_configuration: {
    type: 'object',
    required: ['id', 'configuration', 'revision', 'pricing'],
  },
  save_custom_configuration: {
    type: 'object',
    required: ['id', 'configuration', 'revision', 'pricing'],
  },
  delete_saved_custom_configuration: { type: 'object', required: ['ok', 'deletedConfigurationId'] },
  list_local_builds: { type: 'object', required: ['builds', 'activeBuildId'] },
  save_local_build: { type: 'object', required: ['ok', 'buildId', 'name'] },
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
            inputSchema: tool.inputSchema,
            responseSchema: responseSchemas[toolName],
          };
        },
      },
      {
        name: 'get_acoustom_workflow',
        title: 'Get Acoustom workflow guide',
        description:
          'Returns the recommended agent workflows, tool order, purpose, and the output fields to carry to each next step. An agent without prior context should call this first.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => ({
          version: 2,
          agentProtocol: {
            firstTurn: [
              'Identify the user’s room size or dimensions, listening preference, preferred format, and budget when relevant.',
              'Ask only for missing details that could change the recommendation; do not fabricate them.',
              'Use tool results as the source of truth for catalog facts and suitability evidence.',
              'Give one primary recommendation and a clearly labelled alternative when useful.',
              'Offer to navigate the relevant result into view so the user can review or edit it.',
            ],
            evidenceLabels: {
              catalogFact: 'Directly returned by list_products or get_product.',
              suitabilityReason: 'Derived by recommend_speakers from the stated requirements.',
              simulatedEvidence: 'Returned by a room simulation and dependent on its assumptions.',
            },
            completion:
              'A recommendation is complete when the user has a primary choice, trade-off or alternative, supporting catalog facts, and any important missing evidence or assumptions stated.',
          },
          workflows: [
            {
              id: 'catalogue_research',
              purpose:
                'Recommend, inspect, compare and test catalog speakers for stated room and listening requirements.',
              steps: [
                {
                  tool: 'recommend_speakers',
                  requiredInputs: ['roomSize', 'soundProfile'],
                  optionalInputs: ['preferredFormat', 'budgetEur', 'feedback'],
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
                    'Compare two or three selected products only when the user is deciding between them.',
                },
                {
                  tool: 'simulate_speaker_in_room',
                  optional: true,
                  precondition:
                    'The user supplied known room dimensions, or an estimate was explicitly accepted.',
                  useOutput:
                    'Return in-room frequency response, impulse-response URLs, RT60, assumptions, and profile provenance.',
                },
                {
                  tool: 'navigate_acoustom',
                  optional: true,
                  useOutput:
                    'Show the product, comparison, or listening-lab context for user review.',
                },
              ],
              constraints: [
                'If room size, listening preference, or another material requirement is unknown, ask the user before ranking.',
                'Do not treat the ranking score as a measured acoustic result.',
                'Do not claim that a simulation proves the speaker is best; it only evaluates the selected assumptions.',
              ],
            },
            {
              id: 'custom_build_simulation',
              purpose:
                'Validate a curated custom speaker, generate an accurate catalog sheet, and simulate its returned engineering profile.',
              steps: [
                {
                  tool: 'get_custom_speaker_builder_options',
                  useOutput: 'Choose a server-owned platform.',
                },
                {
                  tool: 'validate_custom_speaker_build',
                  useOutput:
                    'Pass the entire returned build as build to simulate_custom_speaker_in_room.',
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
              ],
              constraints: [
                'If a room image estimate was applied, call get_current_room_spec or rely on the live room state; do not reconstruct its dimensions or layout from memory.',
                'State whether the simulation used live room inputs or explicit overrides.',
              ],
            },
            {
              id: 'shared_simulation_audio',
              purpose:
                'Return a playable, browser-rendered room-simulation WAV after the user has explicitly approved sharing their source track.',
              steps: [
                {
                  tool: 'simulate_speaker_in_room | simulate_custom_speaker_in_room',
                  useOutput: 'The browser uses the returned impulse responses to render its audio.',
                },
                {
                  tool: 'get_shared_simulated_audio',
                  useOutput:
                    'Returns the temporary playable WAV URL, MIME type, and expiry after the user clicks Share with agent.',
                },
              ],
              constraints: [
                'Never claim that an impulse-response URL is a rendered music track.',
                'If get_shared_simulated_audio reports no asset, ask the user to select a track and click Share with agent in the listening lab.',
                'The audio URL is temporary and represents user-authorized content.',
              ],
            },
            {
              id: 'room_image_collaboration',
              purpose:
                'Translate user-provided room images into an editable, best-effort simulation proposal and procedural Listening Lab room.',
              steps: [
                {
                  tool: 'get_room_reference_images',
                  optional: true,
                  useOutput:
                    'When references are present, inspect each temporary image URL before estimating. For images directly attached in the agent conversation, inspect those attachments instead.',
                },
                {
                  tool: 'get_room_estimate_contract',
                  useOutput: 'Follow the exact accepted fields and collaborative guidance.',
                },
                {
                  tool: 'apply_agent_room_estimate',
                  useOutput:
                    'Populates the browser room controls and procedural room view; the user can then refine placement before listening.',
                },
              ],
              constraints: [
                'Listening Lab uploads are user-approved temporary room references for this agent. Direct agent attachments are equally valid input.',
                'State assumptions and confidence; image-derived dimensions are estimates, not measurements.',
                'Ask for a known reference measurement when it would materially improve the estimate.',
                'Never claim a procedural room view is a literal reconstruction of the uploaded image.',
              ],
            },
            {
              id: 'refine_saved_build',
              purpose:
                'Load an existing build, alter it in response to user feedback, revalidate its engineering profile, simulate it, and save the next revision.',
              steps: [
                {
                  tool: 'list_saved_custom_configurations | get_saved_custom_configuration',
                  useOutput: 'Use configuration and revision from the saved design.',
                },
                {
                  tool: 'validate_custom_speaker_build',
                  useOutput: 'Submit the revised configuration before simulation.',
                },
                {
                  tool: 'simulate_custom_speaker_in_room',
                  useOutput: 'Use the validation result as build.',
                },
                {
                  tool: 'save_custom_configuration',
                  useOutput:
                    'Pass configurationId, current expectedRevision, and the revised configuration.',
                },
              ],
            },
            {
              id: 'local_build_management',
              purpose:
                'Create, list, rename, and delete custom speaker builds in the browser without signing in. Builds persist locally and sync to the account on sign-in.',
              steps: [
                {
                  tool: 'list_local_builds',
                  useOutput: 'Inspect existing local builds and their full configuration data.',
                },
                {
                  tool: 'validate_custom_speaker_build',
                  useOutput: 'Validate a new or revised configuration before saving.',
                },
                {
                  tool: 'save_local_build',
                  useOutput: 'Persist the build with a name. Returns buildId for future updates.',
                },
                {
                  tool: 'rename_local_build',
                  optional: true,
                  useOutput: 'Rename a build by its buildId.',
                },
                {
                  tool: 'delete_local_build',
                  optional: true,
                  useOutput: 'Remove a build by its buildId.',
                },
              ],
              constraints: [
                "Local builds are stored in the browser and limited to 20. They sync to the user's account on sign-in.",
                'Use validate_custom_speaker_build before saving to ensure the configuration produces a valid engineering profile.',
              ],
            },
            {
              id: 'shopping_bag',
              purpose:
                'Inspect or change the browser-local bag and wishlist. These changes are not a checkout or purchase.',
              steps: [
                { tool: 'get_cart', useOutput: 'Inspect current bag.' },
                {
                  tool: 'add_to_cart | update_cart_quantity | remove_from_cart',
                  useOutput: 'Use returned items and itemCount as the new state.',
                },
                {
                  tool: 'get_wishlist | toggle_wishlist',
                  useOutput: 'Use returned productNames as the new state.',
                },
              ],
            },
            {
              id: 'visible_navigation',
              purpose:
                'Move the visible Acoustom app to relevant, editable context so the user can review a product, comparison, simulation, or custom design.',
              steps: [
                {
                  tool: 'get_navigation_context',
                  useOutput:
                    'Inspect the current visible page and supported destinations before navigating.',
                },
                {
                  tool: 'navigate_acoustom',
                  useOutput:
                    'Tell the user which page or section is now visible and what they can review or edit.',
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
          'Returns the current visible Acoustom page, selected product where applicable, supported destinations, and the user-facing sections that can be focused. Use before navigating when the current page is unknown.',
        inputSchema: noArgs,
        annotations: readOnly,
        execute: () => latest.current.getNavigationContext(),
      },
      {
        name: 'navigate_acoustom',
        title: 'Navigate Acoustom for user review',
        description:
          'Moves the visible Acoustom app to a supported in-app destination so the user can review or edit relevant context. Use only when showing the page materially helps collaboration. This cannot navigate to arbitrary URLs, checkout, payment, or purchase.',
        inputSchema: navigationInput,
        annotations: action,
        execute: ({ destination, productName, sectionId }) => {
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
          return latest.current.navigate({
            destination: destination as NavigationDestination,
            ...(typeof productName === 'string' ? { productName } : {}),
            ...(typeof sectionId === 'string' ? { sectionId } : {}),
          });
        },
      },
      {
        name: 'recommend_speakers',
        title: 'Recommend speakers',
        description:
          'Ranks catalog speakers for room size and listening preference, with optional format, budget, and feedback. Returns transparent matching reasons; use get_product and simulation to inspect recommendations. Room size and sound profile are required so an empty request cannot be mistaken for a meaningful recommendation.',
        inputSchema: {
          type: 'object',
          properties: {
            roomSize: { type: 'string', enum: ['small', 'medium', 'large'] },
            soundProfile: { type: 'string', enum: ['balanced', 'reference', 'warm', 'immersive'] },
            preferredFormat: { type: 'string', enum: ['standmount', 'floorstanding', 'active'] },
            budgetEur: { type: 'number', minimum: 0 },
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
        execute: ({ roomSize, soundProfile, preferredFormat, budgetEur, feedback }) => {
          const budget = typeof budgetEur === 'number' ? budgetEur : undefined;
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
                      : `within the €${budget} budget`
                  );
                }
                return { productName: product.name, score, reasons, priceEur: price };
              })
              .sort((a, b) => b.score - a.score || a.priceEur - b.priceEur),
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
        description: 'Returns specifications for two or three catalog speakers.',
        inputSchema: {
          type: 'object',
          properties: {
            productNames: {
              type: 'array',
              minItems: 2,
              maxItems: 3,
              items: { type: 'string', minLength: 1, maxLength: 128 },
            },
          },
          required: ['productNames'],
          additionalProperties: false,
        },
        annotations: readOnly,
        execute: ({ productNames }) => {
          if (!Array.isArray(productNames) || productNames.length < 2 || productNames.length > 3)
            throw new Error('Choose two or three speaker names.');
          const products = productNames.map(find);
          if (products.some((item) => !item))
            throw new Error('One or more speakers were not found.');
          return (products as Product[]).map(({ name, type, price, specs }) => ({
            name,
            type,
            price,
            specifications: Object.fromEntries(specs),
          }));
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
        name: 'get_room_reference_images',
        title: 'Get Listening Lab room images',
        description:
          'Returns temporary, user-approved room-image URLs uploaded in Listening Lab. Inspect every returned image before inferring an editable room estimate. If no references are returned, ask the user to upload them in Listening Lab or attach them directly to the agent conversation.',
        inputSchema: noArgs,
        annotations: userContentReadOnly,
        execute: () => {
          const references = useSimulationStore.getState().roomReferenceAssets;
          return {
            references,
            guidance: references.length
              ? 'These image URLs are temporary user-approved visual inputs. Inspect them, then call get_room_estimate_contract followed by apply_agent_room_estimate.'
              : 'No Listening Lab room images are currently available. The user may attach images directly to this conversation instead.',
          };
        },
      },
      {
        name: 'apply_agent_room_estimate',
        title: 'Apply agent room estimate',
        description:
          'Applies an agent’s best-effort image-based room estimate to the live browser simulation controls. This is collaborative, editable, and intentionally not a hard confirmation gate.',
        inputSchema: roomEstimateInput,
        annotations: userContentAction,
        execute: ({
          width,
          length,
          height,
          presetId,
          speakerPositions,
          listener,
          assumptions = [],
          confidence = {},
        }) => {
          const store = useSimulationStore.getState();
          store.setRoomDimensions({
            width: finite(width, 'width'),
            length: finite(length, 'length'),
            height: finite(height, 'height'),
            presetId: String(presetId),
          });
          const positions = speakerPositions as Array<Record<string, unknown>>;
          const target = listener as Record<string, unknown>;
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
        description: 'Adds one to ten pairs of a catalog speaker to the current shopping bag.',
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
        description: 'Sets a speaker quantity in the current bag; use zero to remove it.',
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
        description: 'Removes a catalog speaker completely from the current shopping bag.',
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
        description: 'Saves a catalog speaker to the wishlist, or removes it if already saved.',
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
          "Lists custom speaker builds saved in this browser's local storage. Available without signing in. Each build stores the full spec data aligned with the build process end to end.",
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
            })),
            activeBuildId: stored?.activeBuildId ?? '',
          };
        },
      },
      {
        name: 'save_local_build',
        title: 'Save local custom build',
        description:
          "Creates or updates a custom speaker build in this browser's local storage without requiring sign-in. If buildId is provided, updates that build; otherwise creates a new one. The configuration follows the same schema as validate_custom_speaker_build.",
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
          },
          required: ['name', 'configuration'],
          additionalProperties: false,
        },
        annotations: userContentAction,
        execute: async ({ buildId, name, configuration }) => {
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
          } as CustomSpeakerConfiguration;
          const build = existing ?? createLocalBuild(baseConfig, String(name));
          const updated: LocalBuild = {
            ...build,
            name: String(name),
            configuration: { ...baseConfig, name: String(name) },
            updatedAt: new Date().toISOString(),
          };
          upsertLocalBuild(updated);
          return {
            ok: true,
            buildId: updated.id,
            name: updated.name,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
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
