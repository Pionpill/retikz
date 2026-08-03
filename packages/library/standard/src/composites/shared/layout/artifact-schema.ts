import { LayoutAlignmentGuideDimension } from '@retikz/core';
import { z } from 'zod';

import { LayoutSpacingKind, LayoutTrackSourceKind } from './constants';

const LayoutArtifactAxisOverflowSchema = z.strictObject({
  x: z.boolean().describe('Whether the translated bounds extend outside the assigned slot on the x axis.'),
  y: z.boolean().describe('Whether the translated bounds extend outside the assigned slot on the y axis.'),
});

const LayoutArtifactTranslationSchema = z.strictObject({
  x: z.number().describe('Finite container-local horizontal translation applied to the child.'),
  y: z.number().describe('Finite container-local vertical translation applied to the child.'),
});

export const LayoutArtifactRectSchema = z
  .strictObject({
    x: z.number().describe('Finite container-local horizontal origin.'),
    y: z.number().describe('Finite container-local vertical origin.'),
    width: z.number().nonnegative().describe('Finite non-negative rectangle width.'),
    height: z.number().nonnegative().describe('Finite non-negative rectangle height.'),
  })
  .describe('Finite rectangle in the current layout container allocation coordinate.');

const LayoutSpacingArtifactBaseSchema = z.strictObject({
  kind: z.enum(LayoutSpacingKind).describe('Spacing semantic discriminator.'),
  axis: z.enum(LayoutAlignmentGuideDimension).describe('Physical main axis of the spacing segment.'),
  bounds: LayoutArtifactRectSchema.describe('Spacing segment in container allocation coordinates.'),
});

/** 校验 spacing segment 在其物理主轴上具有正长度 */
const refineLayoutSpacingArtifact = (
  spacing: z.infer<typeof LayoutSpacingArtifactBaseSchema>,
  context: z.RefinementCtx,
) => {
  const mainLength = spacing.axis === LayoutAlignmentGuideDimension.X ? spacing.bounds.width : spacing.bounds.height;
  if (mainLength <= 0) {
    context.addIssue({
      code: 'custom',
      path: ['bounds', spacing.axis === LayoutAlignmentGuideDimension.X ? 'width' : 'height'],
      message: 'Spacing main-axis length must be positive.',
    });
  }
};

export const LayoutSpacingArtifactSchema = LayoutSpacingArtifactBaseSchema.superRefine(
  refineLayoutSpacingArtifact,
).describe('Resolved fixed gap or distributed free-space segment.');

export const LayoutArtifactOverflowSchema = z
  .strictObject({
    allocation: LayoutArtifactAxisOverflowSchema.describe(
      'Axis overflow of translated allocation bounds relative to the assigned slot.',
    ),
    visual: LayoutArtifactAxisOverflowSchema.describe(
      'Axis overflow of translated visual bounds relative to the assigned slot.',
    ),
    clipped: z.boolean().describe('Whether container clipping removes any part of the visual bounds.'),
  })
  .describe('Observable allocation, visual, and clipping overflow state for one layout item.');

export const LayoutArtifactAlignmentGuideSchema = z
  .strictObject({
    name: z.string().min(1).describe('Alignment guide name selected for this item placement.'),
    position: z.number().describe('Finite translated guide position in container allocation coordinates.'),
    fallback: z.boolean().describe('Whether the selected position falls back to an allocation edge.'),
  })
  .describe('Alignment guide actually used to place one layout item.');

export const LayoutArtifactItemBaseSchema = z
  .strictObject({
    key: z.string().min(1).describe('Container-local authored item identity.'),
    sourceIndex: z.number().int().safe().nonnegative().describe('Zero-based authored item order.'),
    marginBounds: LayoutArtifactRectSchema.describe('Assigned slot expanded by resolved item margins.'),
    slotBounds: LayoutArtifactRectSchema.describe('Final parent-assigned child slot without margins.'),
    allocationBounds: LayoutArtifactRectSchema.describe('Translated real child allocation bounds.'),
    visualBounds: LayoutArtifactRectSchema.describe('Translated conservative child visual bounds.'),
    visibleBounds: LayoutArtifactRectSchema.nullable().describe(
      'Visual bounds remaining visible under the container overflow policy, or null when none remain.',
    ),
    translation: LayoutArtifactTranslationSchema.describe('Final translation applied before replay.'),
    overflow: LayoutArtifactOverflowSchema.describe('Observable overflow relative to the slot and container clip.'),
    alignmentGuide: LayoutArtifactAlignmentGuideSchema.optional().describe(
      'Baseline guide or edge fallback used by the item alignment.',
    ),
  })
  .describe('Shared observable placement result for one authored layout item.');

export const LayoutArtifactContainerSchema = z
  .strictObject({
    allocationBounds: LayoutArtifactRectSchema.describe('Resolved container allocation rectangle.'),
    contentBounds: LayoutArtifactRectSchema.describe('Container content rectangle after padding.'),
    visualBounds: LayoutArtifactRectSchema.describe('Union of translated item visual bounds.'),
    visibleBounds: LayoutArtifactRectSchema.nullable().describe(
      'Container-visible visual union, or null when no positive visible area exists.',
    ),
  })
  .describe('Shared observable geometry for one resolved layout container.');

export const LayoutTrackArtifactSchema = z
  .strictObject({
    index: z.number().int().safe().nonnegative().describe('Contiguous zero-based resolved track index.'),
    start: z.number().describe('Finite physical track start in container allocation coordinates.'),
    size: z.number().nonnegative().describe('Finite non-negative resolved track size.'),
    sourceKind: z.enum(LayoutTrackSourceKind).describe('Authored or implicit outer sizing source for the track.'),
    implicit: z.boolean().describe('Whether the track was materialized beyond the authored explicit track list.'),
  })
  .describe('Resolved GridLayout track geometry and source classification.');
