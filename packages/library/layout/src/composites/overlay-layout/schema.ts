import type { infer as ZodInfer, RefinementCtx } from 'zod';

import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { array, discriminatedUnion, enum as zodEnum, literal, number, strictObject } from 'zod';

import { LAYOUT_NAMESPACE } from '../../shared';
import {
  LayoutAlignment,
  LayoutAlignmentSchema,
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutContainerBoxSchema,
  LayoutEdgeAlignmentSchema,
  LayoutItemBaseSchema,
  LayoutItemKind,
} from '../shared';
import { LayoutSizeParticipation, OverlayPlacementKind } from './constants';

const OverlayAtPointSchema = strictObject({
  x: number().describe('Finite horizontal position relative to the content-box start.'),
  y: number().describe('Finite vertical position relative to the content-box start.'),
});

const OverlayAnchorPointSchema = strictObject({
  x: number().min(0).max(1).default(0.5).describe('Normalized horizontal slot anchor.'),
  y: number().min(0).max(1).default(0.5).describe('Normalized vertical slot anchor.'),
});

const OverlayOffsetPointSchema = strictObject({
  x: number().default(0).describe('Finite horizontal post-placement offset.'),
  y: number().default(0).describe('Finite vertical post-placement offset.'),
});

const OverlayAlignedPlacementSchema = strictObject({
  kind: literal(OverlayPlacementKind.Aligned).describe('Discriminator for content-box alignment.'),
}).describe('Aligned OverlayLayout placement.');

const OverlayPositionedPlacementSchema = strictObject({
  kind: literal(OverlayPlacementKind.Positioned).describe('Discriminator for local point positioning.'),
  at: OverlayAtPointSchema.describe('Finite local point relative to the content-box start.'),
  anchor: OverlayAnchorPointSchema.default({ x: 0.5, y: 0.5 }).describe('Normalized child slot anchor.'),
  width: NonNegativeNumberSchema.optional().describe('Optional exact child slot width.'),
  height: NonNegativeNumberSchema.optional().describe('Optional exact child slot height.'),
}).describe('Positioned OverlayLayout placement.');

export const OverlayPlacementSchema = discriminatedUnion('kind', [
  OverlayAlignedPlacementSchema,
  OverlayPositionedPlacementSchema,
])
  .default({ kind: OverlayPlacementKind.Aligned })
  .describe('Closed OverlayLayout placement union.');

export const OverlayLayoutItemSchema = LayoutItemBaseSchema.extend({
  kind: literal(LayoutItemKind.Overlay).describe('Discriminator for an item owned by OverlayLayout.'),
  placement: OverlayPlacementSchema.describe('Aligned or positioned item placement.'),
  offset: OverlayOffsetPointSchema.default({ x: 0, y: 0 }).describe('Finite post-placement translation.'),
  justifySelf: LayoutEdgeAlignmentSchema.optional().describe('Optional horizontal alignment override.'),
  alignSelf: LayoutAlignmentSchema.optional().describe('Optional vertical alignment override.'),
  sizeParticipation: zodEnum(LayoutSizeParticipation)
    .default(LayoutSizeParticipation.Include)
    .describe('Whether the item contributes to intrinsic container size.'),
  zIndex: number().int().default(0).describe('Integer paint-order layer for the item scope.'),
}).describe('Canonical JSON-safe item owned by OverlayLayout.');

const OverlayLayoutBaseSchema = LayoutContainerBoxSchema.extend({
  namespace: literal(LAYOUT_NAMESPACE).describe('Composite namespace for Layout capabilities.'),
  type: literal('overlayLayout').describe('Composite type for deterministic overlay layout.'),
  justifyItems: LayoutEdgeAlignmentSchema.default(LayoutAlignment.Center).describe(
    'Default horizontal alignment inherited by aligned and positioned items.',
  ),
  alignItems: LayoutAlignmentSchema.default(LayoutAlignment.Center).describe(
    'Default vertical alignment inherited by aligned and positioned items.',
  ),
  children: array(OverlayLayoutItemSchema).default([]).describe('Authored overlay items in stable identity order.'),
});

type OverlayLayoutRefinementInput = ZodInfer<typeof OverlayLayoutBaseSchema>;

/** 校验 Overlay item identity 与 effective baseline 语义 */
const refineOverlayLayout = (layout: OverlayLayoutRefinementInput, context: RefinementCtx): void => {
  const seen = new Set<string>();
  layout.children.forEach((item, index) => {
    if (item.key !== undefined && seen.has(item.key)) {
      context.addIssue({
        code: 'custom',
        path: ['children', index, 'key'],
        message: `Duplicate OverlayLayout item key '${item.key}'.`,
      });
    }
    if (item.key !== undefined) seen.add(item.key);
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
  'Canonical JSON-safe Layout OverlayLayout composite.',
);

const OverlayResolvedPointSchema = strictObject({
  x: number().describe('Finite container-local horizontal coordinate.'),
  y: number().describe('Finite container-local vertical coordinate.'),
});

const OverlayResolvedPositionSchema = strictObject({
  target: OverlayResolvedPointSchema.describe('Resolved positioned target in container allocation coordinates.'),
  slotAnchor: OverlayResolvedPointSchema.describe('Resolved slot anchor in container allocation coordinates.'),
});

const OverlayLayoutArtifactItemSchema = LayoutArtifactItemBaseSchema.extend({
  placement: zodEnum(OverlayPlacementKind).describe('Authored aligned or positioned placement mode.'),
  sizeParticipation: zodEnum(LayoutSizeParticipation).describe('Authored structural size participation mode.'),
  zIndex: number().int().describe('Finite integer item stacking layer.'),
  position: OverlayResolvedPositionSchema.optional().describe(
    'Resolved positioned target and slot anchor; present only for positioned items.',
  ),
}).describe('OverlayLayout item placement artifact.');

const OverlayLayoutArtifactBaseSchema = strictObject({
  kind: literal(LayoutItemKind.Overlay).describe('Discriminator for an OverlayLayout artifact payload.'),
  container: LayoutArtifactContainerSchema.describe('Resolved container geometry.'),
  items: array(OverlayLayoutArtifactItemSchema).describe('Items in authored source order.'),
  paintOrder: array(NonBlankStringSchema).describe('All item keys in stable resolved paint order.'),
});

/** 校验 Overlay artifact 的 authored identity 与完整 paint order */
const refineOverlayLayoutArtifact = (
  artifact: ZodInfer<typeof OverlayLayoutArtifactBaseSchema>,
  context: RefinementCtx,
) => {
  const keys = new Set<string>();
  artifact.items.forEach((item, index) => {
    if (item.sourceIndex !== index) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'sourceIndex'],
        message: 'sourceIndex must be contiguous.',
      });
    }
    if (keys.has(item.key)) {
      context.addIssue({ code: 'custom', path: ['items', index, 'key'], message: `Duplicate item key '${item.key}'.` });
    }
    keys.add(item.key);
    if (item.placement === OverlayPlacementKind.Positioned) {
      if (item.position === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'position'],
          message: 'Positioned item must expose its resolved position.',
        });
      } else if (
        Math.abs(item.position.target.x - item.position.slotAnchor.x) > 1e-9 ||
        Math.abs(item.position.target.y - item.position.slotAnchor.y) > 1e-9
      ) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'position', 'slotAnchor'],
          message: 'Resolved slot anchor must coincide with the positioned target.',
        });
      }
    } else if (item.position !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'position'],
        message: 'Aligned item must not expose positioned coordinates.',
      });
    }
  });
  const expected = [...artifact.items]
    .sort((first, second) => first.zIndex - second.zIndex || first.sourceIndex - second.sourceIndex)
    .map(item => item.key);
  if (
    artifact.paintOrder.length !== expected.length ||
    artifact.paintOrder.some((key, index) => key !== expected[index])
  ) {
    context.addIssue({
      code: 'custom',
      path: ['paintOrder'],
      message: 'paintOrder must be the exact stable item permutation.',
    });
  }
};

export const OverlayLayoutArtifactSchema = OverlayLayoutArtifactBaseSchema.superRefine(
  refineOverlayLayoutArtifact,
).describe('Canonical JSON-safe OverlayLayout compile artifact payload.');
