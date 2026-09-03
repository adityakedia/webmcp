/**
 * Curated custom-speaker configuration contract.
 *
 * The customer selects clear product options; cabinet dimensions, driver
 * compatibility and manufacturing constraints remain controlled by the
 * platform catalog and are returned as derived specifications.
 */

export const CUSTOM_SPEAKER_STEPS = [
  'brief', 'platform', 'bass', 'cabinet', 'finish', 'personalisation', 'review',
] as const;
export type CustomSpeakerStep = typeof CUSTOM_SPEAKER_STEPS[number];

export type SpeakerFormat = 'standmount' | 'floorstanding' | 'subwoofer';
export type SoundProfile = 'balanced' | 'reference' | 'warm' | 'immersive';
export type AcousticPlatformId = 'two_way_compact' | 'two_way_extended' | 'three_way_reference' | 'subwoofer_active';
export type EnclosureAlignment = 'sealed' | 'ported';
export type CabinetFinishFamily = 'veneer' | 'paint' | 'premium';
export type CabinetFinishId = 'walnut' | 'oak' | 'black_ash' | 'satin_white' | 'satin_black' | 'deep_blue' | 'custom_colour';
export type GrilleStyle = 'none' | 'magnetic_fabric' | 'perforated_metal';
export type BaseStyle = 'plinth' | 'slim_feet' | 'stand';
export type PersonalisationKind = 'none' | 'engraving' | 'pattern' | 'printed_panel' | 'decal' | 'custom_artwork';
export type ArtworkStatus = 'not_required' | 'pending_upload' | 'under_review' | 'approved' | 'rejected';

export interface DesignBrief {
  format: SpeakerFormat;
  soundProfile: SoundProfile;
  roomSize: 'small' | 'medium' | 'large';
  listeningDistanceM: number;
}

export interface BassConfiguration {
  alignment: EnclosureAlignment;
  bassCharacter: 'tight' | 'balanced' | 'extended';
  tuningHz?: number;
  netVolumeLitres?: number;
  portInnerDiameterMm?: number;
  portLengthMm?: number;
  dampingDescription?: string;
}

export interface CabinetConfiguration {
  size: 'compact' | 'standard' | 'large';
  finish: CabinetFinishId;
  finishFamily: CabinetFinishFamily;
  grille: GrilleStyle;
  base: BaseStyle;
  edgeProfile: 'soft_radius' | 'sculpted_radius';
}

export interface Personalisation {
  kind: PersonalisationKind;
  /** Only laser engraving is offered on baffle-safe zones. */
  engraving?: { text: string; font: 'modern_sans' | 'classic_serif'; placement: 'rear_badge' | 'side_lower'; };
  /** Artwork is restricted to non-acoustic exterior panels. */
  artwork?: {
    assetId?: string;
    application: 'side_panel' | 'rear_panel' | 'grille_badge';
    treatment: 'matte_decal' | 'uv_print' | 'inlaid_pattern';
    rightsConfirmed: boolean;
    status: ArtworkStatus;
  };
}

export interface CustomSpeakerConfiguration {
  version: 1;
  id?: string;
  name: string;
  brief: DesignBrief;
  platformId: AcousticPlatformId;
  bass: BassConfiguration;
  cabinet: CabinetConfiguration;
  personalisation: Personalisation;
}

export interface DerivedSpeakerSpecifications {
  architecture: 'full_range' | 'two_way' | 'three_way' | 'subwoofer';
  drivers: Array<{ role: 'tweeter' | 'midrange' | 'woofer' | 'subwoofer'; allocation: 'platform_controlled'; }>;
  acousticDesign: {
    alignment: EnclosureAlignment;
    portTuningHz?: number;
    netVolumeLitres?: number;
    portInnerDiameterMm?: number;
    portLengthMm?: number;
    dampingDescription?: string;
    dampingMassG?: number;
    baffleWidthMm?: number;
    baffleHeightMm?: number;
    baffleStepDb: number;
    grilleHighFrequencyTrimDb: number;
    crossoverPreset: string;
    bassCharacter: BassConfiguration['bassCharacter'];
    voicingTarget: SoundProfile;
    measurementStatus: 'requires_driver_and_crossover_validation';
  };
  physicalBuild: {
    format: SpeakerFormat;
    cabinetSize: CabinetConfiguration['size'];
    finish: CabinetFinishId;
    finishFamily: CabinetFinishFamily;
    grille: GrilleStyle;
    base: BaseStyle;
    edgeProfile: CabinetConfiguration['edgeProfile'];
  };
  roomRecommendation: {
    roomSize: DesignBrief['roomSize'];
    listeningDistanceM: number;
  };
  simulationProfile: {
    status: 'reference_ready' | 'component_model_ready' | 'requires_measurement';
    referenceId: AcousticPlatformId;
    referenceName: string;
    sourceUrl: string;
    drivers: string[];
    frequencyRangeHz: [number, number];
    sensitivityDb?: number;
    nominalImpedanceOhm?: number;
    maxSplDb?: number;
    crossoverHz: number[];
    modelInputs?: { alignment: 'sealed'; netVolumeLitres: number } | { alignment: 'ported'; netVolumeLitres: number; tuningHz: number };
    acousticModifiers: { baffleStepDb: number; grilleHighFrequencyTrimDb: number; dampingLowFrequencyTrimDb: number };
    modelType: 'published_system_response' | 'component_response_model' | 'requires_measurement';
    sourceAssets: Array<{
      kind: 'system_response' | 'driver_response' | 'impedance' | 'crossover' | 'cabinet';
      sourceUrl: string;
      description: string;
    }>;
    simulatedChanges: string[];
    measurementRequiredFor: string[];
    compatibilityNotes: string[];
  };
  manufacturingStatus: 'ready' | 'requires_design_review';
  warnings: string[];
}

export interface CustomSpeakerBuild extends CustomSpeakerConfiguration {
  derived: DerivedSpeakerSpecifications;
  /** Canonical spec pairs shared with catalog speakers for display. */
  specs: [string, string][];
}

export interface ConfigurationOption<T extends string = string> {
  id: T;
  title: string;
  description: string;
  recommended?: boolean;
  disabledReason?: string;
}

export interface CustomSpeakerCatalog {
  platforms: ConfigurationOption<AcousticPlatformId>[];
  finishes: ConfigurationOption<CabinetFinishId>[];
  personalisation: ConfigurationOption<PersonalisationKind>[];
}

/** Server-owned sourced reference platforms returned by `/api/custom-speakers/catalog`. */
export interface CustomSpeakerCatalogResponse {
  platforms: Array<{
    id: AcousticPlatformId;
    name: string;
    architecture: 'two_way' | 'three_way' | 'subwoofer';
    simulationEligibility: 'reference_ready' | 'requires_measurement';
    sourceUrl: string;
  }>;
}
