import { BaseLayoutInspectOptionsInputSchema } from '@retikz/core';
import { z } from 'zod';

/** FlexLayout family-local inspector sparse schema */
export const FlexLayoutInspectLocalOptionsInputSchema = z.strictObject({
  lines: z.boolean().optional().describe('Whether to draw FlexLayout line regions.'),
  gaps: z.boolean().optional().describe('Whether to shade FlexLayout row and column gaps.'),
});

/** GridLayout family-local inspector sparse schema */
export const GridLayoutInspectLocalOptionsInputSchema = z.strictObject({
  tracks: z.boolean().optional().describe('Whether to draw GridLayout track boundaries.'),
  cells: z.boolean().optional().describe('Whether to draw individual GridLayout cell bounds.'),
  gaps: z.boolean().optional().describe('Whether to shade GridLayout row and column gaps.'),
  spans: z.boolean().optional().describe('Whether to mark items that span multiple GridLayout tracks.'),
});

/** OverlayLayout family-local inspector sparse schema */
export const OverlayLayoutInspectLocalOptionsInputSchema = z.strictObject({
  placements: z.boolean().optional().describe('Whether to draw OverlayLayout placement relations.'),
  anchors: z.boolean().optional().describe('Whether to draw positioned OverlayLayout item anchors.'),
  stacking: z.boolean().optional().describe('Whether to label OverlayLayout stacking order.'),
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
