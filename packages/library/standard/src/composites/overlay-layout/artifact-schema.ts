import { z } from 'zod';

import { LayoutArtifactContainerSchema, LayoutArtifactItemBaseSchema, LayoutItemKind } from '../shared/layout';
import { LayoutSizeParticipation, OverlayPlacementKind } from './constants';

const OverlayResolvedPointSchema = z.strictObject({
  x: z.number().finite().describe('Finite container-local horizontal coordinate.'),
  y: z.number().finite().describe('Finite container-local vertical coordinate.'),
});

const OverlayResolvedPositionSchema = z.strictObject({
  target: OverlayResolvedPointSchema.describe('Resolved positioned target in container allocation coordinates.'),
  slotAnchor: OverlayResolvedPointSchema.describe('Resolved slot anchor in container allocation coordinates.'),
});

const OverlayLayoutArtifactItemSchema = LayoutArtifactItemBaseSchema.extend({
  placement: z.enum(OverlayPlacementKind).describe('Authored aligned or positioned placement mode.'),
  sizeParticipation: z.enum(LayoutSizeParticipation).describe('Authored structural size participation mode.'),
  zIndex: z.number().int().describe('Finite integer item stacking layer.'),
  position: OverlayResolvedPositionSchema.optional().describe(
    'Resolved positioned target and slot anchor; present only for positioned items.',
  ),
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
