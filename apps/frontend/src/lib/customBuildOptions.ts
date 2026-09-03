/**
 * Custom-builder option catalog: titles, imagery and per-option prices.
 *
 * Shared by the builder UI and the price derivation so the comparison matrix
 * always shows a price that matches the components selected in the build.
 */

import type { CustomSpeakerConfiguration } from '@acoustom/types';

export const platformBass = {
  two_way_compact: {
    tuningHz: 42,
    netVolumeLitres: 14,
    portInnerDiameterMm: 50,
    portLengthMm: 200,
  },
  two_way_extended: { tuningHz: 36, netVolumeLitres: 55 },
  three_way_reference: {
    tuningHz: 30,
    netVolumeLitres: 44,
    portInnerDiameterMm: 67,
    portLengthMm: 139.5,
  },
  subwoofer_active: { tuningHz: 36, netVolumeLitres: 18 },
} as const;
export const options = {
  format: [
    {
      id: 'standmount',
      title: 'Standmount',
      image: 'platform-compact.png',
      price: 0,
      copy: 'Compact, stand-supported form.',
    },
    {
      id: 'floorstanding',
      title: 'Floorstanding',
      image: 'platform-extended.png',
      price: 450,
      copy: 'Full-height cabinet with more scale.',
    },
    {
      id: 'subwoofer',
      title: 'Subwoofer',
      image: 'platform-subwoofer.png',
      price: 0,
      copy: 'Dedicated low-frequency cabinet.',
    },
  ],
  platform: [
    {
      id: 'two_way_compact',
      title: 'SEAS Mimir · 2-way',
      image: 'platform-compact.png',
      price: 2400,
      copy: 'Tweeter + 6.5″ woofer · focused imaging.',
    },
    {
      id: 'two_way_extended',
      title: 'SEAS Aphel · 2-way',
      image: 'platform-extended.png',
      price: 3200,
      copy: 'Tweeter + 8″ woofer · deeper reach.',
    },
    {
      id: 'three_way_reference',
      title: 'SEAS 403 Revisited · 3-way',
      image: 'platform-three-way.png',
      price: 4300,
      copy: 'Tweeter + mid + woofer · full range.',
    },
    {
      id: 'subwoofer_active',
      title: 'Dayton active sub',
      image: 'platform-subwoofer.png',
      price: 1400,
      copy: 'Powered low-frequency foundation.',
    },
  ],
  enclosure: [
    {
      id: 'ported',
      title: 'Bass reflex',
      image: 'ported.png',
      price: 160,
      copy: 'Vented cabinet for deeper extension.',
    },
    {
      id: 'sealed',
      title: 'Sealed',
      image: 'sealed.png',
      price: 120,
      copy: 'Closed cabinet for firmer control.',
    },
  ],
  character: [
    {
      id: 'tight',
      title: 'Tight',
      image: 'sealed.png',
      price: 0,
      copy: 'Fast, controlled low end.',
    },
    {
      id: 'balanced',
      title: 'Balanced',
      image: 'ported.png',
      price: 80,
      copy: 'Even weight and control.',
    },
    {
      id: 'extended',
      title: 'Extended',
      image: 'platform-extended.png',
      price: 160,
      copy: 'More depth and room energy.',
    },
  ],
  size: [
    {
      id: 'compact',
      title: 'Compact',
      image: 'platform-compact.png',
      price: 0,
      copy: 'Smallest footprint.',
    },
    {
      id: 'standard',
      title: 'Standard',
      image: 'grille-fabric.png',
      price: 220,
      copy: 'Balanced proportions.',
    },
    {
      id: 'large',
      title: 'Large',
      image: 'platform-three-way.png',
      price: 520,
      copy: 'More internal volume.',
    },
  ],
  grille: [
    {
      id: 'none',
      title: 'Open',
      image: 'woofer-reference.png',
      price: 0,
      copy: 'Drivers remain visible.',
    },
    {
      id: 'magnetic_fabric',
      title: 'Magnetic fabric',
      image: 'grille-fabric.png',
      price: 90,
      copy: 'Soft acoustic protection.',
    },
    {
      id: 'perforated_metal',
      title: 'Perforated metal',
      image: 'black-ash.png',
      price: 170,
      copy: 'Rigid protective grille.',
    },
  ],
  base: [
    {
      id: 'plinth',
      title: 'Plinth',
      image: 'base-plinth.png',
      price: 0,
      copy: 'Grounded floor profile.',
    },
    {
      id: 'slim_feet',
      title: 'Slim feet',
      image: 'platform-extended.png',
      price: 60,
      copy: 'Minimal floor lift.',
    },
    {
      id: 'stand',
      title: 'Stand',
      image: 'base-stand.png',
      price: 340,
      copy: 'Dedicated standmount support.',
    },
  ],
  edge: [
    {
      id: 'soft_radius',
      title: 'Soft radius',
      image: 'edge-soft.png',
      price: 0,
      copy: 'Gentle rounded edge.',
    },
    {
      id: 'sculpted_radius',
      title: 'Sculpted radius',
      image: 'black-ash.png',
      price: 180,
      copy: 'More pronounced contour.',
    },
  ],
  finish: [
    {
      id: 'walnut',
      title: 'Natural walnut',
      image: 'walnut.png',
      price: 0,
      copy: 'Warm open-grain veneer.',
    },
    {
      id: 'black_ash',
      title: 'Black ash',
      image: 'black-ash.png',
      price: 150,
      copy: 'Dark open-grain veneer.',
    },
    {
      id: 'satin_white',
      title: 'Satin white',
      image: 'satin-white.png',
      price: 120,
      copy: 'Smooth painted surface.',
    },
  ],
  personalisation: [
    {
      id: 'none',
      title: 'None',
      image: 'personalisation-none.png',
      price: 0,
      copy: 'Uninterrupted cabinet surface.',
    },
    {
      id: 'engraving',
      title: 'Engraving',
      image: 'personalisation-engraving.png',
      price: 120,
      copy: 'Subtle side-panel maker detail.',
    },
    {
      id: 'pattern',
      title: 'Pattern',
      image: 'personalisation-pattern.png',
      price: 220,
      copy: 'Repeated side-panel motif.',
    },
    {
      id: 'printed_panel',
      title: 'Printed panel',
      image: 'personalisation-printed-panel.png',
      price: 350,
      copy: 'Full side-panel graphic.',
    },
    {
      id: 'decal',
      title: 'Decal',
      image: 'personalisation-decal.png',
      price: 160,
      copy: 'Small side-panel graphic.',
    },
    {
      id: 'custom_artwork',
      title: 'Custom artwork',
      image: 'personalisation-custom-artwork.png',
      price: 500,
      copy: 'Artwork prepared for review.',
    },
  ],
} as const;

/** Pair price for a configuration, from the same option prices the builder shows. */
export function customBuildPrice(config: CustomSpeakerConfiguration): number {
  const find = <T extends { id: string; price: number }>(
    list: readonly T[],
    id: string
  ): number => list.find((item) => item.id === id)?.price ?? 0;
  return (
    find(options.format, config.brief.format) +
    find(options.platform, config.platformId) +
    find(options.enclosure, config.bass.alignment) +
    find(options.character, config.bass.bassCharacter) +
    find(options.size, config.cabinet.size) +
    find(options.finish, config.cabinet.finish) +
    find(options.grille, config.cabinet.grille) +
    find(options.base, config.cabinet.base) +
    find(options.edge, config.cabinet.edgeProfile) +
    find(options.personalisation, config.personalisation.kind)
  );
}
