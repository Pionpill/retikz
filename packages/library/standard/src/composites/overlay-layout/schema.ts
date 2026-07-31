import { z } from 'zod';

import {
  LayoutAlignment,
  LayoutAlignmentSchema,
  LayoutContainerBoxSchema,
  LayoutEdgeAlignmentSchema,
  LayoutItemBaseSchema,
  LayoutItemKind,
} from '../shared/layout';
import { LayoutSizeParticipation, OverlayPlacementKind } from './constants';

const OverlayAtPointSchema = z.strictObject({
  x: z.number().describe('Finite horizontal position relative to the content-box start.'),
  y: z.number().describe('Finite vertical position relative to the content-box start.'),
});

const OverlayAnchorPointSchema = z.strictObject({
  x: z.number().min(0).max(1).default(0.5).describe('Normalized horizontal slot anchor.'),
  y: z.number().min(0).max(1).default(0.5).describe('Normalized vertical slot anchor.'),
});

const OverlayOffsetPointSchema = z.strictObject({
  x: z.number().default(0).describe('Finite horizontal post-placement offset.'),
  y: z.number().default(0).describe('Finite vertical post-placement offset.'),
});

const OverlayAlignedPlacementSchema = z
  .strictObject({
    kind: z.literal(OverlayPlacementKind.Aligned).describe('Discriminator for content-box alignment.'),
  })
  .describe('Aligned OverlayLayout placement.');

const OverlayPositionedPlacementSchema = z
  .strictObject({
    kind: z.literal(OverlayPlacementKind.Positioned).describe('Discriminator for local point positioning.'),
    at: OverlayAtPointSchema.describe('Finite local point relative to the content-box start.'),
    anchor: OverlayAnchorPointSchema.default({ x: 0.5, y: 0.5 }).describe('Normalized child slot anchor.'),
    width: z.number().nonnegative().optional().describe('Optional exact child slot width.'),
    height: z.number().nonnegative().optional().describe('Optional exact child slot height.'),
  })
  .describe('Positioned OverlayLayout placement.');

export const OverlayPlacementSchema = z
  .discriminatedUnion('kind', [OverlayAlignedPlacementSchema, OverlayPositionedPlacementSchema])
  .default({ kind: OverlayPlacementKind.Aligned })
  .describe('Closed OverlayLayout placement union.');

export const OverlayLayoutItemSchema = LayoutItemBaseSchema.extend({
  kind: z.literal(LayoutItemKind.Overlay).describe('Discriminator for an item owned by OverlayLayout.'),
  placement: OverlayPlacementSchema.describe('Aligned or positioned item placement.'),
  offset: OverlayOffsetPointSchema.default({ x: 0, y: 0 }).describe('Finite post-placement translation.'),
  justifySelf: LayoutEdgeAlignmentSchema.optional().describe('Optional horizontal alignment override.'),
  alignSelf: LayoutAlignmentSchema.optional().describe('Optional vertical alignment override.'),
  sizeParticipation: z
    .enum(LayoutSizeParticipation)
    .default(LayoutSizeParticipation.Include)
    .describe('Whether the item contributes to intrinsic container size.'),
  zIndex: z.number().int().default(0).describe('Integer paint-order layer for the item scope.'),
}).describe('Canonical JSON-safe item owned by OverlayLayout.');

const OverlayLayoutBaseSchema = LayoutContainerBoxSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('overlayLayout').describe('Composite type for deterministic overlay layout.'),
  justifyItems: LayoutEdgeAlignmentSchema.default(LayoutAlignment.Center).describe(
    'Default horizontal alignment inherited by aligned and positioned items.',
  ),
  alignItems: LayoutAlignmentSchema.default(LayoutAlignment.Center).describe(
    'Default vertical alignment inherited by aligned and positioned items.',
  ),
  children: z.array(OverlayLayoutItemSchema).default([]).describe('Authored overlay items in stable identity order.'),
});

type OverlayLayoutRefinementInput = z.infer<typeof OverlayLayoutBaseSchema>;

/** 校验 Overlay item identity 与 effective baseline 语义 */
const refineOverlayLayout = (layout: OverlayLayoutRefinementInput, context: z.RefinementCtx): void => {
  const seen = new Set<string>();
  layout.children.forEach((item, index) => {
    if (seen.has(item.key)) {
      context.addIssue({
        code: 'custom',
        path: ['children', index, 'key'],
        message: `Duplicate OverlayLayout item key '${item.key}'.`,
      });
    }
    seen.add(item.key);
    const alignment = item.alignSelf ?? layout.alignItems;
    const isBaseline = alignment === LayoutAlignment.FirstBaseline || alignment === LayoutAlignment.LastBaseline;
    if (item.placement.kind === OverlayPlacementKind.Positioned && isBaseline) {
      context.addIssue({
        code: 'custom',
        path: ['children', index, 'alignSelf'],
        message: 'Positioned OverlayLayout items require an explicit edge alignment when baseline would be effective.',
      });
    }
    if (item.placement.kind === OverlayPlacementKind.Aligned && isBaseline && item.offset.y !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['children', index, 'offset', 'y'],
        message: 'Baseline-aligned OverlayLayout items require zero vertical offset.',
      });
    }
  });
};

export const OverlayLayoutSchema = OverlayLayoutBaseSchema.superRefine(refineOverlayLayout).describe(
  'Canonical JSON-safe Standard OverlayLayout composite.',
);
