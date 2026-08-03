import type { ResolvedBaseLayoutInspectOptions } from '@retikz/core';
import type { z } from 'zod';

import type {
  FlexLayoutInspectLocalOptionsInputSchema,
  FlexLayoutInspectLocalOptionsSchema,
  FlexLayoutInspectOptionsInputSchema,
  GridLayoutInspectLocalOptionsInputSchema,
  GridLayoutInspectLocalOptionsSchema,
  GridLayoutInspectOptionsInputSchema,
  OverlayLayoutInspectLocalOptionsInputSchema,
  OverlayLayoutInspectLocalOptionsSchema,
  OverlayLayoutInspectOptionsInputSchema,
} from './inspect-schema';

/** FlexLayout inspector authoring options */
export type FlexLayoutInspectOptions = z.input<typeof FlexLayoutInspectOptionsInputSchema>;

/** GridLayout inspector authoring options */
export type GridLayoutInspectOptions = z.input<typeof GridLayoutInspectOptionsInputSchema>;

/** OverlayLayout inspector authoring options */
export type OverlayLayoutInspectOptions = z.input<typeof OverlayLayoutInspectOptionsInputSchema>;

/** FlexLayout family-local sparse options */
export type FlexLayoutInspectLocalOptions = z.input<typeof FlexLayoutInspectLocalOptionsInputSchema>;

/** GridLayout family-local sparse options */
export type GridLayoutInspectLocalOptions = z.input<typeof GridLayoutInspectLocalOptionsInputSchema>;

/** OverlayLayout family-local sparse options */
export type OverlayLayoutInspectLocalOptions = z.input<typeof OverlayLayoutInspectLocalOptionsInputSchema>;

/** FlexLayout family-local canonical options */
export type ResolvedFlexLayoutInspectLocalOptions = z.output<typeof FlexLayoutInspectLocalOptionsSchema>;

/** GridLayout family-local canonical options */
export type ResolvedGridLayoutInspectLocalOptions = z.output<typeof GridLayoutInspectLocalOptionsSchema>;

/** OverlayLayout family-local canonical options */
export type ResolvedOverlayLayoutInspectLocalOptions = z.output<typeof OverlayLayoutInspectLocalOptionsSchema>;

/** Standard family inspector lowering context */
export type StandardLayoutInspectContext<TOptions> = Readonly<{
  baseOptions: ResolvedBaseLayoutInspectOptions;
  options: TOptions;
}>;
