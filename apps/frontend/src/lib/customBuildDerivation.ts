/**
 * Client-side derivation of the display and simulation data for a custom
 * speaker build, straight from its stored configuration.
 *
 * This mirrors the backend ``/api/custom-speakers/`` derivation (platform
 * reference tables plus deterministic arithmetic) so the comparison matrix,
 * build sheet and simulator can work from the configuration alone without an
 * API round trip. The backend remains the source of truth for account sync.
 */

import type {
  CustomSpeakerConfiguration,
  DerivedSpeakerSpecifications,
} from '@acoustom/types';

type ReferenceSystem = {
  name: string;
  sourceUrl: string;
  drivers: string[];
  frequencyRangeHz: [number, number];
  sensitivityDb: number;
  nominalImpedanceOhm: number;
  maxSplDb: number;
  crossoverHz: number[];
  alignment: 'sealed' | 'ported';
  portTuningHz?: number;
  netVolumeLitres?: number;
  portInnerDiameterMm?: number;
  portLengthMm?: number;
  dampingDescription?: string;
  dampingMassG?: number;
  format?: 'standmount' | 'floorstanding' | 'subwoofer';
  simulationEligibility: 'reference_ready' | 'requires_measurement';
  modelType: 'published_system_response' | 'component_response_model' | 'requires_measurement';
  sourceAssets: DerivedSpeakerSpecifications['simulationProfile']['sourceAssets'];
};

const REFERENCE_SYSTEMS: Record<CustomSpeakerConfiguration['platformId'], ReferenceSystem> = {
  two_way_compact: {
    name: 'SEAS Mimir',
    sourceUrl: 'https://www.seas.no/images/stories/diykits/pdfdataheet/mimir_plans.pdf',
    drivers: ['SEAS CA18RNX / H1215', 'SEAS 27TDFC / H1189'],
    frequencyRangeHz: [42, 25000],
    sensitivityDb: 85.0,
    nominalImpedanceOhm: 8,
    maxSplDb: 108.0,
    crossoverHz: [2200],
    alignment: 'ported',
    portTuningHz: 42.0,
    netVolumeLitres: 14.0,
    portInnerDiameterMm: 50.0,
    portLengthMm: 200.0,
    dampingDescription: '150 g Acousto-Q, distributed away from the port',
    dampingMassG: 150.0,
    format: 'standmount',
    simulationEligibility: 'reference_ready',
    modelType: 'component_response_model',
    sourceAssets: [
      {
        kind: 'driver_response',
        sourceUrl: 'https://rjbaudio.com/Audiofiles/Driver%20FRD%20files.html',
        description: 'CA18RNX and 27TDFC FRD response data',
      },
      {
        kind: 'driver_response',
        sourceUrl:
          'https://www.seas.no/images/stories/prestige/pdfdatasheet/H1215_CA18RNX_Datasheet.pdf',
        description: 'Official CA18RNX T/S, response and impedance specification',
      },
      {
        kind: 'driver_response',
        sourceUrl:
          'https://www.seas.no/images/stories/prestige/pdfdatasheet/h1189_27tdfc_datasheet.pdf',
        description: 'Official 27TDFC response and impedance specification',
      },
      {
        kind: 'impedance',
        sourceUrl: 'https://rjbaudio.com/Audiofiles/Driver%20FRD%20files.html',
        description: 'CA18RNX and 27TDFC ZMA impedance data',
      },
      {
        kind: 'crossover',
        sourceUrl: 'https://www.seas.no/images/stories/diykits/pdfdataheet/mimir_plans.pdf',
        description: 'Published 2.2 kHz acoustic crossover and enclosure plan',
      },
    ],
  },
  two_way_extended: {
    name: 'SEAS Aphel',
    sourceUrl: 'https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip',
    drivers: ['SEAS H1471-08 CA22RNY', 'SEAS H1212-06 27TBFC/G'],
    frequencyRangeHz: [36, 28000],
    sensitivityDb: 88.0,
    nominalImpedanceOhm: 6,
    maxSplDb: 110.0,
    crossoverHz: [2240],
    alignment: 'ported',
    portTuningHz: 36.0,
    netVolumeLitres: 55.0,
    dampingDescription:
      '4 mm bitumen and 10 mm wool felt; polyester foam above the lower brace, kept clear of the port',
    format: 'floorstanding',
    simulationEligibility: 'requires_measurement',
    modelType: 'component_response_model',
    sourceAssets: [
      {
        kind: 'driver_response',
        sourceUrl: 'https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip',
        description: 'Official in-cabinet on- and off-axis driver responses',
      },
      {
        kind: 'impedance',
        sourceUrl: 'https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip',
        description: 'Official in-cabinet driver impedance curves',
      },
      {
        kind: 'crossover',
        sourceUrl: 'https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip',
        description: 'VituixCAD crossover project and component values',
      },
    ],
  },
  three_way_reference: {
    name: 'SEAS 403 Revisited',
    sourceUrl:
      'https://www.seas.no/index.php?Itemid=250&catid=66%3Aseas-diy-kits&id=651%3Aseas-403-revisited-kit&option=com_content&view=article',
    drivers: ['SEAS 22TFF', 'SEAS MCA12RC', 'SEAS CA26RE4X'],
    frequencyRangeHz: [35, 25000],
    sensitivityDb: 88.0,
    nominalImpedanceOhm: 8,
    maxSplDb: 112.0,
    crossoverHz: [430, 2350],
    alignment: 'ported',
    portTuningHz: 30.0,
    netVolumeLitres: 44.0,
    portInnerDiameterMm: 67.0,
    portLengthMm: 139.5,
    dampingDescription: 'Light damping in marked enclosure areas, clear of drivers and port',
    format: 'standmount',
    simulationEligibility: 'reference_ready',
    modelType: 'published_system_response',
    sourceAssets: [
      {
        kind: 'system_response',
        sourceUrl:
          'https://solen.ca/en/products/seas-prestige-403-revisited-3way-loudspeaker-kit',
        description: 'Published completed-system ALL_SPL curve and VituixCAD project',
      },
      {
        kind: 'impedance',
        sourceUrl:
          'https://solen.ca/en/products/seas-prestige-403-revisited-3way-loudspeaker-kit',
        description: 'Published woofer, midrange and tweeter impedance curves',
      },
      {
        kind: 'cabinet',
        sourceUrl:
          'https://www.seas.no/images/stories/diykits/403/DIY_kit_SEAS_403_Revisited.pdf',
        description: 'Published 44 L cabinet, port and damping plan',
      },
    ],
  },
  subwoofer_active: {
    name: 'Dayton Audio DCS165-4 active mini-sub kit',
    sourceUrl:
      'https://www.parts-express.com/Dayton-Audio-6-1-2-Down-Firing-Active-Mini-Subwoofer-Kit-with-2.1-Channel-Amplifier-300-7161',
    drivers: ['Dayton Audio DCS165-4'],
    frequencyRangeHz: [35, 150],
    sensitivityDb: 87.4,
    nominalImpedanceOhm: 4,
    maxSplDb: 105.0,
    crossoverHz: [30, 150],
    alignment: 'ported',
    simulationEligibility: 'requires_measurement',
    modelType: 'requires_measurement',
    sourceAssets: [
      {
        kind: 'driver_response',
        sourceUrl:
          'https://www.daytonaudio.com/images/resources/data-files/295-198--Dayton-Audio-DCS165-4_data%20%281%29.zip',
        description: 'Official FRD/ZMA package; download currently upstream-protected',
      },
      {
        kind: 'driver_response',
        sourceUrl: 'https://www.brl.fi/bilder/artiklar/pdf/860DCS1654.pdf',
        description: 'Downloaded DCS165-4 manufacturer datasheet with response and impedance plots',
      },
      {
        kind: 'cabinet',
        sourceUrl:
          'https://www.parts-express.com/Dayton-Audio-6-1-2-Down-Firing-Active-Mini-Subwoofer-Kit-with-2.1-Channel-Amplifier-300-7161',
        description: 'Published kit dimensions and DSP crossover range',
      },
    ],
  },
};

const PLATFORM_ROLES: Record<
  CustomSpeakerConfiguration['platformId'],
  { architecture: DerivedSpeakerSpecifications['architecture']; roles: string[] }
> = {
  two_way_compact: { architecture: 'two_way', roles: ['tweeter', 'woofer'] },
  two_way_extended: { architecture: 'two_way', roles: ['tweeter', 'woofer'] },
  three_way_reference: { architecture: 'three_way', roles: ['tweeter', 'midrange', 'woofer'] },
  subwoofer_active: { architecture: 'subwoofer', roles: ['subwoofer'] },
};

const CABINET_SIZE_PRESETS: Record<
  CustomSpeakerConfiguration['cabinet']['size'],
  { volumeFactor: number; baffleWidthMm: number; baffleHeightMm: number }
> = {
  compact: { volumeFactor: 1.0, baffleWidthMm: 210, baffleHeightMm: 360 },
  standard: { volumeFactor: 1.15, baffleWidthMm: 230, baffleHeightMm: 420 },
  large: { volumeFactor: 1.3, baffleWidthMm: 250, baffleHeightMm: 500 },
};

const BASS_CHARACTER_PRESETS: Record<
  CustomSpeakerConfiguration['bass']['bassCharacter'],
  { portedTuningOffsetHz: number; dampingLowFrequencyTrimDb: number }
> = {
  tight: { portedTuningOffsetHz: 3, dampingLowFrequencyTrimDb: -0.75 },
  balanced: { portedTuningOffsetHz: 0, dampingLowFrequencyTrimDb: 0 },
  extended: { portedTuningOffsetHz: -3, dampingLowFrequencyTrimDb: 0.75 },
};

const GRILLE_PRESETS: Record<
  CustomSpeakerConfiguration['cabinet']['grille'],
  { grilleHighFrequencyTrimDb: number }
> = {
  none: { grilleHighFrequencyTrimDb: 0 },
  magnetic_fabric: { grilleHighFrequencyTrimDb: -0.5 },
  perforated_metal: { grilleHighFrequencyTrimDb: -1.0 },
};

const EDGE_PROFILE_PRESETS: Record<
  CustomSpeakerConfiguration['cabinet']['edgeProfile'],
  { baffleStepDb: number }
> = {
  soft_radius: { baffleStepDb: 0 },
  sculpted_radius: { baffleStepDb: 0.5 },
};

/** Derive the full simulation profile and engineering data from a configuration. */
export function deriveBuildData(
  config: CustomSpeakerConfiguration
): { derived: DerivedSpeakerSpecifications; specs: [string, string][] } {
  const { architecture, roles } = PLATFORM_ROLES[config.platformId];
  const reference = REFERENCE_SYSTEMS[config.platformId];
  const sizePreset = CABINET_SIZE_PRESETS[config.cabinet.size];
  const bassPreset = BASS_CHARACTER_PRESETS[config.bass.bassCharacter];
  const grillePreset = GRILLE_PRESETS[config.cabinet.grille];
  const edgePreset = EDGE_PROFILE_PRESETS[config.cabinet.edgeProfile];

  const referenceVolume = config.bass.netVolumeLitres ?? reference.netVolumeLitres ?? 18;
  const netVolumeLitres = Math.round(referenceVolume * sizePreset.volumeFactor * 10) / 10;
  const portTuningHz =
    config.bass.alignment === 'sealed'
      ? undefined
      : Math.round(
          ((config.bass.tuningHz ?? reference.portTuningHz ?? 36) +
            bassPreset.portedTuningOffsetHz) *
            10
        ) / 10;

  const matchesAlignment = config.bass.alignment === reference.alignment;
  const matchesTuning =
    reference.portTuningHz === undefined || portTuningHz === reference.portTuningHz;
  const matchesFormat = reference.format ? config.brief.format === reference.format : true;
  const matchesVolume = netVolumeLitres === reference.netVolumeLitres;
  const matchesPort =
    config.bass.portInnerDiameterMm === reference.portInnerDiameterMm &&
    config.bass.portLengthMm === reference.portLengthMm;
  const matchesResponseModifiers =
    config.cabinet.size === 'compact' &&
    config.bass.bassCharacter === 'balanced' &&
    edgePreset.baffleStepDb === 0 &&
    grillePreset.grilleHighFrequencyTrimDb === 0;
  const profileReady =
    reference.simulationEligibility === 'reference_ready' &&
    matchesAlignment &&
    matchesTuning &&
    matchesFormat &&
    matchesVolume &&
    matchesPort &&
    matchesResponseModifiers;
  const componentModelReady =
    netVolumeLitres !== undefined &&
    (config.bass.alignment === 'sealed' || portTuningHz !== undefined);

  const warnings = [
    'Acoustic response, sensitivity and impedance require the selected drivers, net ' +
      'enclosure volume, port geometry and crossover to be measured and validated.',
  ];
  const simulatedChanges = ['room geometry', 'room absorption', 'speaker and listener position'];
  if (componentModelReady) {
    simulatedChanges.push(
      'net enclosure volume',
      'bass alignment',
      'port tuning',
      'baffle step',
      'grille high-frequency trim',
      'damping low-frequency trim'
    );
  }
  const measurementRequiredFor = [
    'driver substitution',
    'net volume',
    'port geometry',
    'baffle geometry',
    'damping',
    'crossover parts',
  ];
  if (config.personalisation.kind !== 'none') {
    warnings.push('Personalisation requires design review before production.');
  }
  if (config.cabinet.finish === 'custom_colour') {
    warnings.push('Custom colours require finish-sample approval.');
  }

  const derived: DerivedSpeakerSpecifications = {
    architecture,
    drivers: roles.map((role) => ({ role, allocation: 'platform_controlled' })) as DerivedSpeakerSpecifications['drivers'],
    acousticDesign: {
      alignment: config.bass.alignment,
      portTuningHz,
      netVolumeLitres,
      portInnerDiameterMm: config.bass.portInnerDiameterMm,
      portLengthMm: config.bass.portLengthMm,
      dampingDescription: config.bass.dampingDescription ?? reference.dampingDescription,
      dampingMassG: reference.dampingMassG,
      baffleWidthMm: sizePreset.baffleWidthMm,
      baffleHeightMm: sizePreset.baffleHeightMm,
      baffleStepDb: edgePreset.baffleStepDb,
      grilleHighFrequencyTrimDb: grillePreset.grilleHighFrequencyTrimDb,
      crossoverPreset: `${config.platformId}_published_crossover`,
      bassCharacter: config.bass.bassCharacter,
      voicingTarget: config.brief.soundProfile,
      measurementStatus: 'requires_driver_and_crossover_validation',
    },
    physicalBuild: {
      format: config.brief.format,
      cabinetSize: config.cabinet.size,
      finish: config.cabinet.finish,
      finishFamily: config.cabinet.finishFamily,
      grille: config.cabinet.grille,
      base: config.cabinet.base,
      edgeProfile: config.cabinet.edgeProfile,
    },
    roomRecommendation: {
      roomSize: config.brief.roomSize,
      listeningDistanceM: config.brief.listeningDistanceM,
    },
    simulationProfile: {
      status: profileReady ? 'reference_ready' : 'component_model_ready',
      referenceId: config.platformId,
      referenceName: reference.name,
      sourceUrl: reference.sourceUrl,
      drivers: reference.drivers,
      frequencyRangeHz: reference.frequencyRangeHz,
      sensitivityDb: reference.sensitivityDb,
      nominalImpedanceOhm: reference.nominalImpedanceOhm,
      maxSplDb: reference.maxSplDb,
      crossoverHz: reference.crossoverHz,
      modelInputs: componentModelReady
        ? config.bass.alignment === 'sealed'
          ? { alignment: 'sealed', netVolumeLitres }
          : { alignment: 'ported', netVolumeLitres, tuningHz: portTuningHz ?? 0 }
        : undefined,
      acousticModifiers: {
        baffleStepDb: edgePreset.baffleStepDb,
        grilleHighFrequencyTrimDb: grillePreset.grilleHighFrequencyTrimDb,
        dampingLowFrequencyTrimDb: bassPreset.dampingLowFrequencyTrimDb,
      },
      modelType: reference.modelType,
      sourceAssets: reference.sourceAssets,
      simulatedChanges,
      measurementRequiredFor,
      compatibilityNotes: profileReady
        ? ['Matches the documented reference alignment, format, net volume and port geometry.']
        : [
            'Uses the documented CA18RNX driver data and selected enclosure alignment, volume and tuning. This is an estimated component model, not a measured completed-speaker response.',
          ],
    },
    manufacturingStatus: 'requires_design_review',
    warnings,
  };
  return { derived, specs: deriveSpecs(derived) };
}

const DIMENSIONS: Record<string, Record<string, string>> = {
  standmount: {
    compact: '360 × 200 × 280 mm',
    standard: '440 × 215 × 360 mm',
    large: '520 × 250 × 430 mm',
  },
  floorstanding: {
    compact: '700 × 250 × 300 mm',
    standard: '900 × 290 × 310 mm',
    large: '1180 × 290 × 390 mm',
  },
  subwoofer: {
    compact: '320 × 320 × 360 mm',
    standard: '380 × 380 × 420 mm',
    large: '450 × 450 × 480 mm',
  },
};

const WEIGHT: Record<string, Record<string, string>> = {
  standmount: {
    compact: '11 kg each',
    standard: '16 kg each',
    large: '24 kg each',
  },
  floorstanding: {
    compact: '18 kg each',
    standard: '26 kg each',
    large: '40 kg each',
  },
  subwoofer: {
    compact: '8 kg each',
    standard: '12 kg each',
    large: '16 kg each',
  },
};

const ampPower = (sensitivityDb: number | undefined) => {
  if (!sensitivityDb) return '—';
  if (sensitivityDb < 85) return '50 – 150 W';
  if (sensitivityDb < 88) return '40 – 180 W';
  if (sensitivityDb < 90) return '40 – 200 W';
  return '30 – 250 W';
};

const pretty = (value: string) => value.replace(/_/g, ' ');

/** Convert derived data into the canonical [key, value] spec pairs for display. */
export function deriveSpecs(d: DerivedSpeakerSpecifications): [string, string][] {
  const p = d.simulationProfile;
  const a = d.acousticDesign;
  const c = d.physicalBuild;
  const isSub = c.format === 'subwoofer';
  return [
    ['System', p.referenceName],
    [
      'Frequency response',
      `${p.frequencyRangeHz[0]} Hz – ${p.frequencyRangeHz[1]} Hz`,
    ],
    ['Sensitivity', p.sensitivityDb ? `${p.sensitivityDb} dB (2.83 V / 1 m)` : '—'],
    ['Nominal impedance', p.nominalImpedanceOhm ? `${p.nominalImpedanceOhm} Ω` : '—'],
    ['Recommended amplifier power', ampPower(p.sensitivityDb)],
    [
      'Crossover frequency',
      p.crossoverHz.length ? p.crossoverHz.map((hz) => String(hz)).join(' / ') + ' Hz' : '—',
    ],
    ['Maximum SPL', p.maxSplDb ? `${p.maxSplDb} dB at 1 m` : '—'],
    [
      'Amplification',
      isSub ? 'Built-in class-D amplification' : 'Passive (external amplification required)',
    ],
    ['Cabinet materials', 'MDF with internal bracing'],
    ['Cabinet finishes', pretty(c.finish)],
    ['Grille', pretty(c.grille)],
    ['Base', pretty(c.base)],
    ['Directivity', '—'],
    ['Inputs', isSub ? 'Line-level RCA / Speaker-level' : 'Single-wired speaker terminals'],
    ['Calibration', '—'],
    ['Wireless', '—'],
    ['Room correction', '—'],
    ['Dimensions (H × W × D)', DIMENSIONS[c.format]?.[c.cabinetSize] ?? '—'],
    ['Weight', WEIGHT[c.format]?.[c.cabinetSize] ?? '—'],
    ['Alignment', pretty(a.alignment)],
    ['Bass character', pretty(a.bassCharacter)],
    ['Net volume', a.netVolumeLitres ? `${a.netVolumeLitres} L` : '—'],
    ['Port tuning', a.portTuningHz ? `${a.portTuningHz} Hz` : 'Sealed'],
    ['Architecture', d.architecture],
    [
      'Drivers',
      d.drivers.map((driver) => pretty(driver.role)).join(' / ') || '—',
    ],
    ['Format', c.format],
    ['Cabinet size', c.cabinetSize],
    ['Finish family', c.finishFamily],
    ['Edge profile', pretty(c.edgeProfile)],
    ['Port diameter', a.portInnerDiameterMm ? `${a.portInnerDiameterMm} mm` : '—'],
    ['Port length', a.portLengthMm ? `${a.portLengthMm} mm` : '—'],
    ['Damping', a.dampingDescription ?? '—'],
    ['Damping mass', a.dampingMassG ? `${a.dampingMassG} g` : '—'],
    ['Baffle width', a.baffleWidthMm ? `${a.baffleWidthMm} mm` : '—'],
    ['Baffle height', a.baffleHeightMm ? `${a.baffleHeightMm} mm` : '—'],
    ['Baffle-step adjustment', `${a.baffleStepDb >= 0 ? '+' : ''}${a.baffleStepDb} dB`],
    [
      'Grille HF adjustment',
      `${a.grilleHighFrequencyTrimDb >= 0 ? '+' : ''}${a.grilleHighFrequencyTrimDb} dB`,
    ],
    ['Crossover preset', a.crossoverPreset],
    ['Voicing target', a.voicingTarget],
    ['Measurement status', a.measurementStatus],
    ['Simulation status', p.status],
    ['Model type', p.modelType],
    ['Room size', d.roomRecommendation.roomSize],
    ['Listening distance', `${d.roomRecommendation.listeningDistanceM} m`],
    ['Manufacturing status', d.manufacturingStatus],
    ['Warnings', d.warnings.length ? d.warnings.join('; ') : 'None'],
    ['Compatibility notes', p.compatibilityNotes.join('; ') || '—'],
    ['Measurement required for', p.measurementRequiredFor.join('; ') || '—'],
    ['Simulated changes', p.simulatedChanges.join('; ') || '—'],
    ['Reference source', p.sourceUrl],
    [
      'Source assets',
      p.sourceAssets.map((asset) => asset.description).join('; ') || '—',
    ],
  ];
}
