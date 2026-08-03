import { BaseLayoutInspectOptionsInputSchema } from '@retikz/core';
import { z } from 'zod';

/** FlexLayout family-local inspector sparse schema */
export const FlexLayoutInspectLocalOptionsInputSchema = z
  .strictObject({
    lines: z.boolean().optional().describe('Whether to draw FlexLayout line regions.'),
    gaps: z.boolean().optional().describe('Whether to shade authored FlexLayout row and column gaps.'),
    distributedSpace: z
      .boolean()
      .optional()
      .describe(
        'Whether to draw only the dashed perimeter of positive free space introduced by FlexLayout content distribution, leaving its interior transparent.',
      ),
  })
  .describe('Sparse FlexLayout-specific inspection options.');

/** GridLayout family-local inspector sparse schema */
export const GridLayoutInspectLocalOptionsInputSchema = z
  .strictObject({
    tracks: z.boolean().optional().describe('Whether to draw GridLayout track boundaries.'),
    cells: z.boolean().optional().describe('Whether to draw individual GridLayout cell bounds.'),
    gaps: z.boolean().optional().describe('Whether to shade authored GridLayout row and column gaps.'),
    distributedSpace: z
      .boolean()
      .optional()
      .describe(
        'Whether to draw only the dashed perimeter of positive free space introduced by GridLayout content distribution, leaving its interior transparent.',
      ),
    spans: z.boolean().optional().describe('Whether to mark items that span multiple GridLayout tracks.'),
  })
  .describe('Sparse GridLayout-specific inspection options.');

/** OverlayLayout family-local inspector sparse schema */
export const OverlayLayoutInspectLocalOptionsInputSchema = z
  .strictObject({
    placements: z.boolean().optional().describe('Whether to draw OverlayLayout placement relations.'),
    anchors: z.boolean().optional().describe('Whether to draw positioned OverlayLayout item anchors.'),
    stacking: z.boolean().optional().describe('Whether to label OverlayLayout stacking order.'),
  })
  .describe('Sparse OverlayLayout-specific inspection options.');

/** FlexLayout inspector 完整 authoring schema */
export const FlexLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  FlexLayoutInspectLocalOptionsInputSchema.shape,
).describe('Sparse shared and FlexLayout-specific inspection options.');

/** GridLayout inspector 完整 authoring schema */
export const GridLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  GridLayoutInspectLocalOptionsInputSchema.shape,
).describe('Sparse shared and GridLayout-specific inspection options.');

/** OverlayLayout inspector 完整 authoring schema */
export const OverlayLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  OverlayLayoutInspectLocalOptionsInputSchema.shape,
).describe('Sparse shared and OverlayLayout-specific inspection options.');

/** FlexLayout family-local canonical schema */
export const FlexLayoutInspectLocalOptionsSchema = FlexLayoutInspectLocalOptionsInputSchema.transform(value =>
  Object.freeze({
    lines: value.lines ?? true,
    gaps: value.gaps ?? true,
    distributedSpace: value.distributedSpace ?? true,
  }),
).describe('Canonical FlexLayout-specific inspection options.');

/** GridLayout family-local canonical schema */
export const GridLayoutInspectLocalOptionsSchema = GridLayoutInspectLocalOptionsInputSchema.transform(value =>
  Object.freeze({
    tracks: value.tracks ?? true,
    cells: value.cells ?? false,
    gaps: value.gaps ?? true,
    distributedSpace: value.distributedSpace ?? true,
    spans: value.spans ?? true,
  }),
).describe('Canonical GridLayout-specific inspection options.');

/** OverlayLayout family-local canonical schema */
export const OverlayLayoutInspectLocalOptionsSchema = OverlayLayoutInspectLocalOptionsInputSchema.transform(value =>
  Object.freeze({
    placements: value.placements ?? true,
    anchors: value.anchors ?? true,
    stacking: value.stacking ?? false,
  }),
).describe('Canonical OverlayLayout-specific inspection options.');
