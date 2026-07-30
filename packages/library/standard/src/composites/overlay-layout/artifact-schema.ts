import { z } from 'zod';

import { LayoutArtifactContainerSchema, LayoutArtifactItemBaseSchema, LayoutItemKind } from '../shared/layout';
import { LayoutSizeParticipation, OverlayPlacementKind } from './constants';

const OverlayLayoutArtifactItemSchema = LayoutArtifactItemBaseSchema.extend({
  placement: z.enum(OverlayPlacementKind).describe('Authored aligned or positioned placement mode.'),
  sizeParticipation: z.enum(LayoutSizeParticipation).describe('Authored structural size participation mode.'),
  zIndex: z.number().int().describe('Finite integer item stacking layer.'),
}).describe('OverlayLayout item placement artifact.');

const OverlayLayoutArtifactBaseSchema = z.strictObject({
  kind: z.literal(LayoutItemKind.Overlay).describe('Discriminator for an OverlayLayout artifact payload.'),
  container: LayoutArtifactContainerSchema.describe('Resolved container geometry.'),
  items: z.array(OverlayLayoutArtifactItemSchema).describe('Items in authored source order.'),
  paintOrder: z.array(z.string().min(1)).describe('All item keys in stable resolved paint order.'),
});

/** 校验 Overlay artifact 的 authored identity 与完整 paint order */
const refineOverlayLayoutArtifact = (
  artifact: z.infer<typeof OverlayLayoutArtifactBaseSchema>,
  context: z.RefinementCtx,
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
