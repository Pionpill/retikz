import {
  BaseLayoutInspectOptionsInputSchema,
  BoxSpacingSchema,
  ChildSchema,
  LayoutAlignmentGuideDimension,
} from '@retikz/core';
import { z } from 'zod';

import {
  LayoutAlignment,
  LayoutAxisSizeKind,
  LayoutDistribution,
  LayoutItemKind,
  LayoutOverflow,
  LayoutSpacingKind,
  LayoutTrackSourceKind,
} from './constants';

const LayoutContentAxisSizeSchema = z.strictObject({
  kind: z.literal(LayoutAxisSizeKind.Content).describe('Discriminator for intrinsic content sizing.'),
  min: z.number().nonnegative().optional().describe('Optional authored minimum allocation size.'),
  max: z.number().nonnegative().optional().describe('Optional authored maximum allocation size.'),
});

const LayoutFixedAxisSizeSchema = z.strictObject({
  kind: z.literal(LayoutAxisSizeKind.Fixed).describe('Discriminator for fixed allocation sizing.'),
  value: z.number().nonnegative().describe('Authored fixed allocation size.'),
});

const LayoutFillAxisSizeSchema = z.strictObject({
  kind: z.literal(LayoutAxisSizeKind.Fill).describe('Discriminator for filling finite parent allocation.'),
  min: z.number().nonnegative().optional().describe('Optional authored minimum allocation size.'),
  max: z.number().nonnegative().optional().describe('Optional authored maximum allocation size.'),
});

export const LayoutAxisSizeSchema = z
  .discriminatedUnion('kind', [LayoutContentAxisSizeSchema, LayoutFixedAxisSizeSchema, LayoutFillAxisSizeSchema])
  .superRefine((value, context) => {
    if ('min' in value && value.min !== undefined && value.max !== undefined && value.min > value.max) {
      context.addIssue({
        code: 'custom',
        path: ['max'],
        message: 'max must be greater than or equal to min.',
      });
    }
  })
  .describe('Physical-axis allocation size policy for a Standard layout container.');

const ContentAxisSizeDefault = Object.freeze({ kind: LayoutAxisSizeKind.Content });

export const LayoutSizeSchema = z
  .strictObject({
    x: LayoutAxisSizeSchema.default(ContentAxisSizeDefault).describe('Horizontal allocation size policy.'),
    y: LayoutAxisSizeSchema.default(ContentAxisSizeDefault).describe('Vertical allocation size policy.'),
  })
  .default({ x: ContentAxisSizeDefault, y: ContentAxisSizeDefault })
  .describe('Physical x and y allocation size policies.');

const LayoutSpacingSchema = z
  .union([z.number().nonnegative(), BoxSpacingSchema])
  .describe('Uniform or side-specific non-negative box spacing.');

export const LayoutOverflowSchema = z
  .enum(LayoutOverflow)
  .describe('Whether visual overflow remains visible or is clipped to the container allocation.');

export const LayoutContainerBoxSchema = z
  .strictObject({
    size: LayoutSizeSchema.describe('Container allocation size including padding.'),
    padding: LayoutSpacingSchema.default(0).describe('Insets from allocation box to content box.'),
    overflow: LayoutOverflowSchema.default(LayoutOverflow.Visible).describe('Container visual overflow policy.'),
  })
  .describe('Shared Box contract for Standard layout containers.');

export const LayoutAlignmentSchema = z
  .enum(LayoutAlignment)
  .describe('Item alignment including optional baseline-aware variants.');

export const LayoutEdgeAlignmentSchema = z
  .enum([LayoutAlignment.Start, LayoutAlignment.Center, LayoutAlignment.End, LayoutAlignment.Stretch])
  .describe('Edge alignment without baseline variants.');

export const LayoutDistributionSchema = z
  .enum(LayoutDistribution)
  .describe('Distribution of positive or negative free space along one physical axis.');

export const LayoutItemBaseSchema = z
  .strictObject({
    kind: z.enum(LayoutItemKind).describe('Discriminator selecting the owning Standard layout container.'),
    key: z.string().min(1).describe('Container-local stable authored item identity.'),
    child: ChildSchema.describe('JSON-safe Core child laid out by the container.'),
    margin: LayoutSpacingSchema.default(0).describe('Item margin outside the parent allocation slot.'),
  })
  .describe('Shared JSON-safe child item contract for Standard layouts.');

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
