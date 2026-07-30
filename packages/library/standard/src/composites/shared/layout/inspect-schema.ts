import { BaseLayoutInspectOptionsInputSchema } from '@retikz/core';
import { z } from 'zod';

/** FlexLayout family-local inspector sparse schema */
export const FlexLayoutInspectLocalOptionsInputSchema = z.strictObject({
  lines: z.boolean().optional(),
  gaps: z.boolean().optional(),
});

/** GridLayout family-local inspector sparse schema */
export const GridLayoutInspectLocalOptionsInputSchema = z.strictObject({
  tracks: z.boolean().optional(),
  cells: z.boolean().optional(),
  gaps: z.boolean().optional(),
  spans: z.boolean().optional(),
});

/** OverlayLayout family-local inspector sparse schema */
export const OverlayLayoutInspectLocalOptionsInputSchema = z.strictObject({
  placements: z.boolean().optional(),
  anchors: z.boolean().optional(),
  stacking: z.boolean().optional(),
});

/** FlexLayout inspector 完整 authoring schema */
export const FlexLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  FlexLayoutInspectLocalOptionsInputSchema.shape,
);

/** GridLayout inspector 完整 authoring schema */
export const GridLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  GridLayoutInspectLocalOptionsInputSchema.shape,
);

/** OverlayLayout inspector 完整 authoring schema */
export const OverlayLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  OverlayLayoutInspectLocalOptionsInputSchema.shape,
);

/** FlexLayout family-local canonical schema */
export const FlexLayoutInspectLocalOptionsSchema = FlexLayoutInspectLocalOptionsInputSchema.transform(value =>
  Object.freeze({ lines: value.lines ?? true, gaps: value.gaps ?? true }),
);

/** GridLayout family-local canonical schema */
export const GridLayoutInspectLocalOptionsSchema = GridLayoutInspectLocalOptionsInputSchema.transform(value =>
  Object.freeze({
    tracks: value.tracks ?? true,
    cells: value.cells ?? false,
    gaps: value.gaps ?? true,
    spans: value.spans ?? true,
  }),
);

/** OverlayLayout family-local canonical schema */
export const OverlayLayoutInspectLocalOptionsSchema = OverlayLayoutInspectLocalOptionsInputSchema.transform(value =>
  Object.freeze({
    placements: value.placements ?? true,
    anchors: value.anchors ?? true,
    stacking: value.stacking ?? false,
  }),
);
