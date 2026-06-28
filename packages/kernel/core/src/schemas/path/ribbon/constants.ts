import type { ValueOf } from '../../../types';

export const RibbonMode = {
  Centerline: 'centerline',
  Boundary: 'boundary',
} as const;

export const RibbonAlignment = {
  Center: 'center',
  Left: 'left',
  Right: 'right',
} as const;

export const RibbonCap = {
  Butt: 'butt',
  Round: 'round',
  Square: 'square',
} as const;

export const RibbonArcCapSweep = {
  Short: 'short',
  Long: 'long',
} as const;

export type RibbonModeValue = ValueOf<typeof RibbonMode>;

export type RibbonAlignmentValue = ValueOf<typeof RibbonAlignment>;

export type RibbonCapValue = ValueOf<typeof RibbonCap>;

export type RibbonArcCapSweepValue = ValueOf<typeof RibbonArcCapSweep>;
