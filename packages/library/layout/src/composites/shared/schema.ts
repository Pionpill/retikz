import type { infer as ZodInfer, RefinementCtx } from 'zod';

import { BoxSpacingSchema, ChildSchema, LayoutAlignmentGuideDimension } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeIntegerSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { boolean, discriminatedUnion, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import {
  LayoutAlignment,
  LayoutAxisSizeKind,
  LayoutDistribution,
  LayoutItemKind,
  LayoutOverflow,
  LayoutSpacingKind,
} from './constants';

/** 布局中相邻内容之间的非负物理间距 */
export const LayoutGapSchema = NonNegativeNumberSchema.describe('Non-negative physical gap in user units.');

const LayoutContentAxisSizeSchema = strictObject({
  kind: literal(LayoutAxisSizeKind.Content).describe('Discriminator for intrinsic content sizing.'),
  min: NonNegativeNumberSchema.optional().describe('Optional authored minimum allocation size.'),
  max: NonNegativeNumberSchema.optional().describe('Optional authored maximum allocation size.'),
});

const LayoutFixedAxisSizeSchema = strictObject({
  kind: literal(LayoutAxisSizeKind.Fixed).describe('Discriminator for fixed allocation sizing.'),
  value: NonNegativeNumberSchema.describe('Authored fixed allocation size.'),
});

const LayoutFillAxisSizeSchema = strictObject({
  kind: literal(LayoutAxisSizeKind.Fill).describe('Discriminator for filling finite parent allocation.'),
  min: NonNegativeNumberSchema.optional().describe('Optional authored minimum allocation size.'),
  max: NonNegativeNumberSchema.optional().describe('Optional authored maximum allocation size.'),
});

export const LayoutAxisSizeSchema = discriminatedUnion('kind', [
  LayoutContentAxisSizeSchema,
  LayoutFixedAxisSizeSchema,
  LayoutFillAxisSizeSchema,
])
  .superRefine((value, context) => {
    if ('min' in value && value.min !== undefined && value.max !== undefined && value.min > value.max) {
      context.addIssue({
        code: 'custom',
        path: ['max'],
        message: 'max must be greater than or equal to min.',
      });
    }
  })
  .describe('Physical-axis allocation size policy for a Layout container.');

const ContentAxisSizeDefault = Object.freeze({ kind: LayoutAxisSizeKind.Content });

export const LayoutSizeSchema = strictObject({
  x: LayoutAxisSizeSchema.default(ContentAxisSizeDefault).describe('Horizontal allocation size policy.'),
  y: LayoutAxisSizeSchema.default(ContentAxisSizeDefault).describe('Vertical allocation size policy.'),
})
  .default({ x: ContentAxisSizeDefault, y: ContentAxisSizeDefault })
  .describe('Physical x and y allocation size policies.');

const LayoutSpacingSchema = union([NonNegativeNumberSchema, BoxSpacingSchema]).describe(
  'Uniform or side-specific non-negative box spacing.',
);

export const LayoutOverflowSchema = zodEnum(LayoutOverflow).describe(
  'Whether visual overflow remains visible or is clipped to the container allocation.',
);

export const LayoutContainerBoxSchema = strictObject({
  size: LayoutSizeSchema.describe('Container allocation size including padding.'),
  padding: LayoutSpacingSchema.default(0).describe('Insets from allocation box to content box.'),
  overflow: LayoutOverflowSchema.default(LayoutOverflow.Visible).describe('Container visual overflow policy.'),
}).describe('Shared Box contract for Layout containers.');

export const LayoutAlignmentSchema = zodEnum(LayoutAlignment).describe(
  'Item alignment including optional baseline-aware variants.',
);

export const LayoutEdgeAlignmentSchema = zodEnum([
  LayoutAlignment.Start,
  LayoutAlignment.Center,
  LayoutAlignment.End,
  LayoutAlignment.Stretch,
]).describe('Edge alignment without baseline variants.');

export const LayoutDistributionSchema = zodEnum(LayoutDistribution).describe(
  'Distribution of positive or negative free space along one physical axis.',
);

export const LayoutItemBaseSchema = strictObject({
  kind: zodEnum(LayoutItemKind).describe('Discriminator selecting the owning Layout container.'),
  key: NonBlankStringSchema.describe('Container-local stable authored item identity.'),
  child: ChildSchema.describe('JSON-safe Core child laid out by the container.'),
  margin: LayoutSpacingSchema.default(0).describe('Item margin outside the parent allocation slot.'),
}).describe('Shared JSON-safe child item contract for Layouts.');

const LayoutArtifactAxisOverflowSchema = strictObject({
  x: boolean().describe('Whether the translated bounds extend outside the assigned slot on the x axis.'),
  y: boolean().describe('Whether the translated bounds extend outside the assigned slot on the y axis.'),
});

const LayoutArtifactTranslationSchema = strictObject({
  x: number().describe('Finite container-local horizontal translation applied to the child.'),
  y: number().describe('Finite container-local vertical translation applied to the child.'),
});

export const LayoutArtifactRectSchema = strictObject({
  x: number().describe('Finite container-local horizontal origin.'),
  y: number().describe('Finite container-local vertical origin.'),
  width: NonNegativeNumberSchema.describe('Finite non-negative rectangle width.'),
  height: NonNegativeNumberSchema.describe('Finite non-negative rectangle height.'),
}).describe('Finite rectangle in the current layout container allocation coordinate.');

const LayoutSpacingArtifactBaseSchema = strictObject({
  kind: zodEnum(LayoutSpacingKind).describe('Spacing semantic discriminator.'),
  axis: zodEnum(LayoutAlignmentGuideDimension).describe('Physical main axis of the spacing segment.'),
  bounds: LayoutArtifactRectSchema.describe('Spacing segment in container allocation coordinates.'),
});

/** 校验 spacing segment 在其物理主轴上具有正长度 */
const refineLayoutSpacingArtifact = (
  spacing: ZodInfer<typeof LayoutSpacingArtifactBaseSchema>,
  context: RefinementCtx,
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

export const LayoutArtifactOverflowSchema = strictObject({
  allocation: LayoutArtifactAxisOverflowSchema.describe(
    'Axis overflow of translated allocation bounds relative to the assigned slot.',
  ),
  visual: LayoutArtifactAxisOverflowSchema.describe(
    'Axis overflow of translated visual bounds relative to the assigned slot.',
  ),
  clipped: boolean().describe('Whether container clipping removes any part of the visual bounds.'),
}).describe('Observable allocation, visual, and clipping overflow state for one layout item.');

export const LayoutArtifactAlignmentGuideSchema = strictObject({
  name: NonBlankStringSchema.describe('Alignment guide name selected for this item placement.'),
  position: number().describe('Finite translated guide position in container allocation coordinates.'),
  fallback: boolean().describe('Whether the selected position falls back to an allocation edge.'),
}).describe('Alignment guide actually used to place one layout item.');

export const LayoutArtifactItemBaseSchema = strictObject({
  key: NonBlankStringSchema.describe('Container-local authored item identity.'),
  sourceIndex: NonNegativeIntegerSchema.describe('Zero-based authored item order.'),
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
}).describe('Shared observable placement result for one authored layout item.');

export const LayoutArtifactContainerSchema = strictObject({
  allocationBounds: LayoutArtifactRectSchema.describe('Resolved container allocation rectangle.'),
  contentBounds: LayoutArtifactRectSchema.describe('Container content rectangle after padding.'),
  visualBounds: LayoutArtifactRectSchema.describe('Union of translated item visual bounds.'),
  visibleBounds: LayoutArtifactRectSchema.nullable().describe(
    'Container-visible visual union, or null when no positive visible area exists.',
  ),
}).describe('Shared observable geometry for one resolved layout container.');
